SELECT
  COUNT(*) as total_traces,
  COALESCE(SUM(tokens), 0) as total_tokens,
  COALESCE(SUM(cost_usd), 0) as total_cost,
  COALESCE(AVG(latency_ms), 0) as avg_latency,
  COALESCE(
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
    0
  ) as success_rate
FROM traces
WHERE customer_id = $1
  AND ($2::text IS NULL OR environment = $2)
  AND ($3::timestamptz IS NULL OR timestamp >= $3)
  AND ($4::timestamptz IS NULL OR timestamp <= $4)