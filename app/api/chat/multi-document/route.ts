import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { crossDocumentAnalyzer } from '@/lib/cross-document-analyzer';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      includeDocuments = [], // Specific documents to include
      excludeDocuments = [], // Documents to exclude
      maxSources = 8,
      includeConflicts = true,
      minConfidence = 0.3,
      chatMode = 'unified' // 'unified', 'search', or 'compare'
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const chatStartTime = Date.now();
    let result: any;
    let responseMetadata: any = {};

    // Route to appropriate handler based on chat mode
    switch (chatMode) {
      case 'unified':
        // Query across all documents with unified knowledge base
        result = await crossDocumentAnalyzer.queryUnifiedKnowledgeBase(
          message,
          userId,
          {
            maxSources: Math.min(maxSources, 20),
            includeConflicts,
            minConfidence: Math.max(0, Math.min(1, minConfidence))
          }
        );

        responseMetadata = {
          mode: 'unified',
          sourcesUsed: result.sources.length,
          documentsSearched: result.sources.reduce((acc: Set<string>, source: any) => {
            acc.add(source.documentId);
            return acc;
          }, new Set()).size,
          confidence: result.confidence,
          hasConflicts: result.conflictingInfo && result.conflictingInfo.length > 0
        };
        break;

      case 'search':
        // Search across documents and provide results with AI summary
        const searchResult = await crossDocumentAnalyzer.searchAcrossDocuments(
          message,
          userId,
          {
            limit: maxSources,
            minRelevanceScore: minConfidence,
            excludeDocuments,
            includeDocuments
          }
        );

        if (searchResult.results.length === 0) {
          result = {
            consolidatedAnswer: `No relevant information found for "${message}" across your documents. Try rephrasing your question or check if you've uploaded relevant documents.`,
            sources: [],
            confidence: 0
          };
        } else {
          // Create a simple summary of search results
          const topResults = searchResult.results.slice(0, 5);
          const summaryText = topResults
            .map((r, i) => `${i + 1}. From "${r.documentName}": ${r.content.substring(0, 200)}...`)
            .join('\n\n');

          result = {
            consolidatedAnswer: `I found ${searchResult.results.length} relevant passages across ${searchResult.documentsSearched} documents:\n\n${summaryText}`,
            sources: searchResult.results,
            confidence: Math.min(searchResult.results[0]?.relevanceScore || 0, 0.9)
          };
        }

        responseMetadata = {
          mode: 'search',
          totalResults: searchResult.totalResults,
          documentsSearched: searchResult.documentsSearched,
          processingTime: searchResult.processingTime
        };
        break;

      case 'compare':
        // This mode would need document IDs to compare
        const docIds = body.documentIds;
        if (!docIds || !Array.isArray(docIds) || docIds.length !== 2) {
          return NextResponse.json(
            { error: 'Compare mode requires exactly 2 document IDs in documentIds array' },
            { status: 400 }
          );
        }

        const comparison = await crossDocumentAnalyzer.compareDocuments(
          docIds[0],
          docIds[1],
          userId
        );

        result = {
          consolidatedAnswer: `Document Comparison between "${comparison.document1.name}" and "${comparison.document2.name}":

**Similarity Score:** ${(comparison.similarity * 100).toFixed(1)}%

**Common Themes:**
${comparison.commonThemes.map(theme => `• ${theme}`).join('\n')}

**Unique to ${comparison.document1.name}:**
${comparison.uniqueToDoc1.map(item => `• ${item}`).join('\n')}

**Unique to ${comparison.document2.name}:**
${comparison.uniqueToDoc2.map(item => `• ${item}`).join('\n')}

**Key Differences:**
${comparison.keyDifferences.map(diff => `• ${diff}`).join('\n')}`,
          sources: [
            {
              documentId: comparison.document1.id,
              documentName: comparison.document1.name,
              content: 'Full document comparison',
              relevanceScore: 1.0,
              chunkIndex: 0
            },
            {
              documentId: comparison.document2.id,
              documentName: comparison.document2.name,
              content: 'Full document comparison',
              relevanceScore: 1.0,
              chunkIndex: 0
            }
          ],
          confidence: comparison.similarity
        };

        responseMetadata = {
          mode: 'compare',
          similarity: comparison.similarity,
          commonThemes: comparison.commonThemes.length,
          differences: comparison.keyDifferences.length
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid chat mode. Use "unified", "search", or "compare"' },
          { status: 400 }
        );
    }

    // Track analytics
    try {
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'multi_document_chat',
        documentId: 'multi-doc-chat',
        eventData: {
          messageLength: message.length,
          responseLength: result.consolidatedAnswer.length,
          processingTime: Date.now() - chatStartTime,
          chatMode,
          sourcesUsed: result.sources.length,
          confidence: result.confidence,
          ...responseMetadata
        }
      });

      // Store conversation in a special multi-document collection
      const messageId = `multi_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await convex.mutation(api.conversations.upsertConversation, {
        documentId: 'multi-document-chat',
        userId,
        message: {
          id: messageId,
          role: 'user',
          content: message,
          timestamp: chatStartTime,
          metadata: { chatMode, ...responseMetadata }
        }
      });

      const responseId = `multi_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await convex.mutation(api.conversations.upsertConversation, {
        documentId: 'multi-document-chat',
        userId,
        message: {
          id: responseId,
          role: 'assistant',
          content: result.consolidatedAnswer,
          timestamp: Date.now(),
          metadata: {
            processingTime: Date.now() - chatStartTime,
            sources: result.sources,
            confidence: result.confidence,
            chatMode,
            ...responseMetadata
          }
        }
      });

    } catch (analyticsError) {
      console.error('Error tracking multi-document chat analytics:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      response: result.consolidatedAnswer,
      sources: result.sources,
      confidence: result.confidence,
      conflictingInfo: result.conflictingInfo,
      metadata: {
        chatMode,
        processingTime: Date.now() - chatStartTime,
        timestamp: new Date().toISOString(),
        ...responseMetadata
      }
    });

  } catch (error) {
    console.error('Multi-document chat error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process multi-document chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve multi-document chat history
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
      const history = await convex.query(api.conversations.getConversationHistory, {
        documentId: 'multi-document-chat',
        userId,
        limit: Math.min(limit, 100)
      });

      return NextResponse.json({
        success: true,
        history: history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toISOString(),
          metadata: msg.metadata
        }))
      });

    } catch {
      return NextResponse.json({
        success: true,
        history: [],
        note: 'Multi-document chat history not available'
      });
    }

  } catch (error) {
    console.error('Error retrieving multi-document chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}