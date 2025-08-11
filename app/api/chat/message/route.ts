import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/memory-only-hybrid-store';
import { enhancedRAG } from '@/lib/enhanced-rag';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, docId } = body;

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

    // Check for special commands
    let aiResponse: string;
    
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
      // Use enhanced RAG for general questions
      aiResponse = await enhancedRAG.generateResponse(docId, message);
    }

    // Update document chat statistics
    await hybridDocumentStore.incrementMessageCount(docId, userId);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageCount: (documentWithContent.metadata.messageCount || 0) + 1,
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