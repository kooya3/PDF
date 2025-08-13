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
        // Track if connection is closed
        let isClosed = false;
        
        // Send initial connection message
        const sendEvent = (data: any) => {
          if (isClosed) {
            console.warn('Attempted to send event to closed stream');
            return;
          }
          
          try {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch (error) {
            console.warn('Stream controller error:', error);
            isClosed = true;
          }
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
        
        let consecutiveErrors = 0;
        const maxErrors = 3;
        
        const subscribeToUserDocuments = async () => {
          try {
            // Clear previous subscriptions
            documentUnsubscribers.forEach(unsub => unsub());
            documentUnsubscribers.length = 0;
            
            // Subscribe to current user documents (with error handling)
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
            
            // Reset error count on success
            consecutiveErrors = 0;
          } catch (error) {
            consecutiveErrors++;
            console.warn(`Document subscription error ${consecutiveErrors}/${maxErrors}:`, error);
            
            if (consecutiveErrors >= maxErrors) {
              console.warn('Too many consecutive errors, reducing subscription frequency');
            }
          }
        };

        // Initial subscription to user documents
        (async () => {
          await subscribeToUserDocuments();
        })();

        // Periodically check for new documents and update subscriptions (with backoff)
        const intervalId = setInterval(async () => {
          // Skip if too many consecutive errors
          if (consecutiveErrors < maxErrors) {
            await subscribeToUserDocuments();
          }
          
          // Send heartbeat
          sendEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            stats: hybridDocumentStore.getStats()
          });
        }, 5000);

        // Cleanup on stream close
        request.signal?.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(intervalId);
          unsubscribeUser();
          documentUnsubscribers.forEach(unsub => unsub());
          try {
            controller.close();
          } catch (error) {
            console.warn('Controller already closed:', error);
          }
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