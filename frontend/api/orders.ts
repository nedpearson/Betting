export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return res.status(200).json({
      status: 'REJECTED',
      reason: 'Safety Lock: Live execution is gated. System is currently operating in INTELLIGENCE ONLY mode.',
      mode: 'INTELLIGENCE_ONLY',
    });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
