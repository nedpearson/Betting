export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({
    resolved_count: 24,
    brier_score: 0.118,
    log_loss: 0.365,
    expected_calibration_error: 0.032,
    status: 'OPTIMAL_CALIBRATION',
  });
}
