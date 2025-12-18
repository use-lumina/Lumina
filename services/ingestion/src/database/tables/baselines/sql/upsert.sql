INSERT INTO cost_baselines (
  service_name, endpoint, time_window,
  p50_cost, p95_cost, p99_cost,
  sample_count, last_updated
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
)
ON CONFLICT (service_name, endpoint, time_window) DO UPDATE SET
  p50_cost = EXCLUDED.p50_cost,
  p95_cost = EXCLUDED.p95_cost,
  p99_cost = EXCLUDED.p99_cost,
  sample_count = EXCLUDED.sample_count,
  last_updated = EXCLUDED.last_updated