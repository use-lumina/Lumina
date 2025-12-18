INSERT INTO traces (
  trace_id, span_id, parent_span_id, customer_id, timestamp,
  service_name, endpoint, environment, model, provider,
  prompt, response, tokens, prompt_tokens, completion_tokens,
  latency_ms, cost_usd, metadata, tags, status, error_message
) VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15,
  $16, $17, $18, $19, $20, $21
)
ON CONFLICT (trace_id, span_id) DO UPDATE SET
  timestamp = EXCLUDED.timestamp,
  latency_ms = EXCLUDED.latency_ms,
  status = EXCLUDED.status