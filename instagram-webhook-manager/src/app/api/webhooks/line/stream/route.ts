import { NextRequest } from 'next/server';

// Store active SSE connections
declare global {
  var lineSSEClients: Set<ReadableStreamDefaultController> | undefined;
}

global.lineSSEClients = global.lineSSEClients || new Set();

export async function GET(request: NextRequest) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the global set
      global.lineSSEClients.add(controller);
      console.log('New SSE client connected. Total clients:', global.lineSSEClients.size);

      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to LINE webhook stream'
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`data: ${heartbeat}\n\n`));
        } catch (error) {
          // Client disconnected, clean up
          clearInterval(heartbeatInterval);
          global.lineSSEClients.delete(controller);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        global.lineSSEClients.delete(controller);
        console.log('SSE client disconnected. Remaining clients:', global.lineSSEClients.size);
        controller.close();
      });
    },
  });

  // Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

// Helper function to broadcast events to all connected clients
export function broadcastLineWebhookEvent(event: any) {
  const encoder = new TextEncoder();
  const data = JSON.stringify({
    type: 'webhook',
    event,
    timestamp: new Date().toISOString()
  });
  const message = encoder.encode(`data: ${data}\n\n`);

  // Send to all connected clients
  const deadClients = new Set<ReadableStreamDefaultController>();
  
  global.lineSSEClients.forEach(controller => {
    try {
      controller.enqueue(message);
    } catch (error) {
      // Client is disconnected, mark for removal
      deadClients.add(controller);
    }
  });

  // Remove dead clients
  deadClients.forEach(client => {
    global.lineSSEClients.delete(client);
  });

  if (deadClients.size > 0) {
    console.log(`Removed ${deadClients.size} disconnected SSE clients`);
  }
}