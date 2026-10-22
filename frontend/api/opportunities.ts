export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
  return res.status(200).json({
    opportunities: [],
    checked_at: new Date().toISOString(),
  });
}
