INSERT INTO alerts (
  alert_id, trace_id, span_id, customer_id, alert_type, severity,
  current_cost, baseline_cost, cost_increase_percent,
  hash_similarity, semantic_score, scoring_method, semantic_cached,
  service_name, endpoint, model, reasoning, timestamp
) VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9,
  $10, $11, $12, $13,
  $14, $15, $16, $17, $18
)