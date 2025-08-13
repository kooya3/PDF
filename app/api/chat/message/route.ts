import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';
import { enhancedRAG } from '@/lib/enhanced-rag';
import { hybridChatService, type ModelProvider } from '@/lib/hybrid-chat-service';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, docId, forceProvider, temperature, maxTokens, useHybridRouting = true } = body;

    if (!message || !docId) {
      return NextResponse.json(
        { error: 'Message and document ID are required' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Get document from hybrid store
    const documentWithContent = await hybridDocumentStore.getDocumentWithContent(docId, userId);
    
    if (!documentWithContent) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (documentWithContent.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - document belongs to another user' },
        { status: 403 }
      );
    }
    
    // Check if document is processed
    if (documentWithContent.metadata.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Document is still being processed',
          status: documentWithContent.metadata.status,
          progress: documentWithContent.metadata.progress
        },
        { status: 423 } // Locked
      );
    }

    // Check if document has content
    if (!documentWithContent.content.fullText) {
      return NextResponse.json(
        { error: 'Document content not available' },
        { status: 422 }
      );
    }

    // Check for special commands and get chat history
    let aiResponse: string;
    let provider: ModelProvider = 'ollama';
    let model: string = 'llama3.2';
    let reasoning: string = 'Default assignment';

    // Get conversation history for context
    let chatHistory: Array<{role: string, content: string, timestamp: Date}> = [];
    try {
      const conversationHistory = await convex.query(api.conversations.getConversationHistory, {
        documentId: docId,
        userId,
        limit: 10
      });
      chatHistory = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (historyError) {
      console.log('Could not retrieve chat history:', historyError);
    }
    
    if (useHybridRouting) {
      // Use the new hybrid chat service with intelligent routing
      try {
        const chatContext = {
          documentId: docId,
          userId,
          fileName: documentWithContent.metadata.name,
          history: chatHistory
        };

        const hybridResult = await hybridChatService.chatWithIntelligentRouting(
          message,
          chatContext,
          {
            forceProvider: forceProvider as ModelProvider,
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 1000
          }
        );

        aiResponse = hybridResult.response;
        provider = hybridResult.provider;
        model = hybridResult.model;
        reasoning = hybridResult.reasoning;

      } catch (hybridError) {
        console.error('Hybrid routing failed, falling back to enhanced RAG:', hybridError);
        // Fallback to the original enhanced RAG system
        if (message.toLowerCase().includes('summarize') || message.toLowerCase().includes('summary')) {
          aiResponse = await enhancedRAG.summarizeDocument(docId);
        } else if (message.toLowerCase().includes('extract dates') || message.toLowerCase().includes('find dates')) {
          aiResponse = await enhancedRAG.extractKeyInfo(docId, 'dates');
        } else if (message.toLowerCase().includes('extract numbers') || message.toLowerCase().includes('find numbers')) {
          aiResponse = await enhancedRAG.extractKeyInfo(docId, 'numbers');
        } else if (message.toLowerCase().includes('extract people') || message.toLowerCase().includes('find people')) {
          aiResponse = await enhancedRAG.extractKeyInfo(docId, 'people');
        } else if (message.toLowerCase().includes('extract topics') || message.toLowerCase().includes('main topics')) {
          aiResponse = await enhancedRAG.extractKeyInfo(docId, 'topics');
        } else if (message.toLowerCase().includes('action items') || message.toLowerCase().includes('next steps')) {
          aiResponse = await enhancedRAG.extractKeyInfo(docId, 'actions');
        } else {
          aiResponse = await enhancedRAG.generateResponse(docId, message);
        }
        aiResponse += '\n\n*Note: Using fallback RAG system due to hybrid routing failure*';
      }
    } else {
      // Use original enhanced RAG system
      if (message.toLowerCase().includes('summarize') || message.toLowerCase().includes('summary')) {
        aiResponse = await enhancedRAG.summarizeDocument(docId);
      } else if (message.toLowerCase().includes('extract dates') || message.toLowerCase().includes('find dates')) {
        aiResponse = await enhancedRAG.extractKeyInfo(docId, 'dates');
      } else if (message.toLowerCase().includes('extract numbers') || message.toLowerCase().includes('find numbers')) {
        aiResponse = await enhancedRAG.extractKeyInfo(docId, 'numbers');
      } else if (message.toLowerCase().includes('extract people') || message.toLowerCase().includes('find people')) {
        aiResponse = await enhancedRAG.extractKeyInfo(docId, 'people');
      } else if (message.toLowerCase().includes('extract topics') || message.toLowerCase().includes('main topics')) {
        aiResponse = await enhancedRAG.extractKeyInfo(docId, 'topics');
      } else if (message.toLowerCase().includes('action items') || message.toLowerCase().includes('next steps')) {
        aiResponse = await enhancedRAG.extractKeyInfo(docId, 'actions');
      } else {
        aiResponse = await enhancedRAG.generateResponse(docId, message);
      }
    }

    // Update document chat statistics
    await hybridDocumentStore.incrementMessageCount(docId, userId);

    // Track chat analytics and persist conversation
    const chatStartTime = Date.now();
    try {
      // Track analytics event
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'chat_message',
        documentId: docId,
        eventData: {
          messageLength: message.length,
          responseLength: aiResponse.length,
          processingTime: Date.now() - chatStartTime,
          documentName: documentWithContent.metadata.name
        }
      });

      // Persist conversation history
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add user message
      await convex.mutation(api.conversations.upsertConversation, {
        documentId: docId,
        userId,
        message: {
          id: messageId,
          role: 'user',
          content: message,
          timestamp: chatStartTime
        }
      });

      // Add AI response
      const responseId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await convex.mutation(api.conversations.upsertConversation, {
        documentId: docId,
        userId,
        message: {
          id: responseId,
          role: 'assistant',
          content: aiResponse,
          timestamp: Date.now(),
          metadata: {
            processingTime: Date.now() - chatStartTime,
            relevantChunks: [], // Could be enhanced to track which chunks were used
            confidence: 0.8, // Placeholder confidence score
            provider,
            model,
            reasoning
          }
        }
      });
    } catch (analyticsError) {
      console.error('Error tracking chat analytics/conversation:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageCount: (documentWithContent.metadata.messageCount || 0) + 1,
      aiMetadata: {
        provider,
        model,
        reasoning,
        usingHybridRouting: useHybridRouting
      },
      documentInfo: {
        name: documentWithContent.metadata.name,
        type: documentWithContent.metadata.type,
        wordCount: documentWithContent.metadata.wordCount,
        chunkCount: documentWithContent.content.chunks.length
      }
    });

  } catch (error) {
    console.error('Error in chat message API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve chat history (simplified for memory store)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');
    
    if (!docId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      );
    }

    // Get document metadata from hybrid store
    const document = await hybridDocumentStore.getDocument(docId, userId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (document.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // For now, return basic chat info since we're focusing on real-time chat
    return NextResponse.json({
      success: true,
      messageCount: document.messageCount || 0,
      lastChatAt: document.lastChatAt,
      documentInfo: {
        name: document.name,
        status: document.status,
        wordCount: document.wordCount
      }
    });

  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}