export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return res.status(200).json({
      status: 'HALTED',
      time: new Date().toISOString(),
      reason: 'Manual kill switch activated via terminal interface',
    });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
