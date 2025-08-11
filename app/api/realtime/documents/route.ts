import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Set up Server-Sent Events (SSE)
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const sendEvent = (data: any) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        // Send initial user documents
        const initialDocs = await hybridDocumentStore.getUserDocuments(userId);
        sendEvent({
          type: 'initial_documents',
          documents: initialDocs,
          timestamp: new Date().toISOString()
        });

        // Subscribe to user document updates
        const unsubscribeUser = hybridDocumentStore.subscribe(
          `user:${userId}:documents`,
          (data) => {
            sendEvent({
              type: 'document_update',
              ...data,
              timestamp: new Date().toISOString()
            });
          }
        );

        // Subscribe to individual document updates for this user's documents
        const documentUnsubscribers: Array<() => void> = [];
        
        const subscribeToUserDocuments = async () => {
          // Clear previous subscriptions
          documentUnsubscribers.forEach(unsub => unsub());
          documentUnsubscribers.length = 0;
          
          // Subscribe to current user documents
          const currentDocs = await hybridDocumentStore.getUserDocuments(userId);
          currentDocs.forEach(doc => {
            const unsubscribe = hybridDocumentStore.subscribe(
              `document:${doc.id}`,
              (data) => {
                sendEvent({
                  type: 'document_status',
                  ...data,
                  timestamp: new Date().toISOString()
                });
              }
            );
            documentUnsubscribers.push(unsubscribe);
          });
        };

        // Initial subscription to user documents
        (async () => {
          await subscribeToUserDocuments();
        })();

        // Periodically check for new documents and update subscriptions
        const intervalId = setInterval(async () => {
          await subscribeToUserDocuments();
          
          // Send heartbeat
          sendEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            stats: hybridDocumentStore.getStats()
          });
        }, 5000);

        // Cleanup on stream close
        request.signal?.addEventListener('abort', () => {
          clearInterval(intervalId);
          unsubscribeUser();
          documentUnsubscribers.forEach(unsub => unsub());
          controller.close();
        });
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
      }
    });

  } catch (error) {
    console.error('Error in realtime documents API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}