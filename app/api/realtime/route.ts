import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentStore } from '@/lib/memory-store';

/**
 * Real-time API for document processing updates
 * Provides Server-Sent Events (SSE) for real-time dashboard updates
 */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    // Create Server-Sent Events stream
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const data = `data: ${JSON.stringify({
          type: 'connected',
          userId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Subscribe to relevant channels
        const unsubscribeFunctions: Array<() => void> = [];

        if (docId) {
          // Subscribe to specific document updates
          const unsubDoc = documentStore.subscribe(`document:${docId}`, (updateData) => {
            const message = `data: ${JSON.stringify({
              type: 'document_update',
              docId,
              ...updateData,
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            try {
              controller.enqueue(encoder.encode(message));
            } catch (error) {
              console.error('SSE send error:', error);
            }
          });
          
          const unsubProcessing = documentStore.subscribe(`processing:${docId}`, (event) => {
            const message = `data: ${JSON.stringify({
              type: 'processing_event',
              docId,
              event,
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            try {
              controller.enqueue(encoder.encode(message));
            } catch (error) {
              console.error('SSE send error:', error);
            }
          });

          unsubscribeFunctions.push(unsubDoc, unsubProcessing);
        } else {
          // Subscribe to all user document updates
          const unsubUserDocs = documentStore.subscribe(`user:${userId}:documents`, (updateData) => {
            const message = `data: ${JSON.stringify({
              type: 'user_documents_update',
              userId,
              ...updateData,
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            try {
              controller.enqueue(encoder.encode(message));
            } catch (error) {
              console.error('SSE send error:', error);
            }
          });

          unsubscribeFunctions.push(unsubUserDocs);
        }

        // Send periodic heartbeat
        const heartbeat = setInterval(() => {
          const heartbeatMsg = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          try {
            controller.enqueue(encoder.encode(heartbeatMsg));
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeat);
          }
        }, 30000); // Every 30 seconds

        // Store cleanup function
        const cleanup = () => {
          clearInterval(heartbeat);
          unsubscribeFunctions.forEach(unsub => unsub());
        };

        // Handle client disconnect
        request.signal?.addEventListener('abort', cleanup);
        
        // Auto-cleanup after 1 hour
        setTimeout(() => {
          cleanup();
          controller.close();
        }, 60 * 60 * 1000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      },
    });

  } catch (error) {
    console.error('Real-time API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, docId } = body;

    switch (action) {
      case 'get_document':
        const doc = documentStore.getDocument(docId);
        return NextResponse.json({ document: doc });

      case 'get_user_documents':
        const docs = documentStore.getUserDocuments(userId);
        return NextResponse.json({ documents: docs });

      case 'get_processing_events':
        const events = documentStore.getProcessingEvents(docId, 20);
        return NextResponse.json({ events });

      case 'get_stats':
        const stats = documentStore.getStats();
        return NextResponse.json({ stats });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Real-time POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}