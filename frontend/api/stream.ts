import { BACKEND_URL } from './_backend';

export default async function handler(req: any, res: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  // Announce live stream connection with true status
  const payload = JSON.stringify({
    type: 'system.connected',
    data: {
      ts: new Date().toISOString(),
      transport: 'sse',
      status: 'CONNECTED',
    },
  });
  res.write(`data: ${payload}\n\n`);

  // Heartbeat to keep connection alive per SSE spec
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', ts: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
