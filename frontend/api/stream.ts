export default function handler(req: any, res: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const payload = JSON.stringify({
    type: 'ui.ticks',
    data: {
      ts: new Date().toISOString(),
      engine: 'ONLINE',
    },
  });

  res.write(`data: ${payload}\n\n`);

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', ts: new Date().toISOString() })}\n\n`);
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
