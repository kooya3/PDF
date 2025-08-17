import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return new Response('workspaceId is required', { status: 400 });
    }

    console.log(`[Notifications] Setting up SSE stream for workspace ${workspaceId}, user ${userId}`);

    const encoder = new TextEncoder();
    
    let isConnected = true;
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation
        const data = encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
        controller.enqueue(data);

        // Set up periodic heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          if (!isConnected) {
            clearInterval(heartbeat);
            return;
          }
          
          try {
            const heartbeatData = encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
            controller.enqueue(heartbeatData);
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeat);
            isConnected = false;
          }
        }, 30000); // 30 seconds

        // In a real implementation, you would subscribe to Convex real-time updates here
        // For now, we'll simulate with a simple interval that could check for new notifications
        const notificationCheck = setInterval(async () => {
          if (!isConnected) {
            clearInterval(notificationCheck);
            return;
          }

          try {
            // In a real implementation, this would be a Convex subscription
            // For now, we'll just maintain the connection
            // When new notifications arrive via Convex, you would send them like this:
            // const notificationData = encoder.encode(`data: ${JSON.stringify(notification)}\n\n`);
            // controller.enqueue(notificationData);
          } catch (error) {
            console.error('Notification check error:', error);
            clearInterval(notificationCheck);
            isConnected = false;
          }
        }, 5000); // Check every 5 seconds

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          console.log(`[Notifications] SSE connection closed for workspace ${workspaceId}, user ${userId}`);
          isConnected = false;
          clearInterval(heartbeat);
          clearInterval(notificationCheck);
          controller.close();
        });
      },
      
      cancel() {
        console.log(`[Notifications] SSE stream cancelled for workspace ${workspaceId}, user ${userId}`);
        isConnected = false;
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE setup error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}