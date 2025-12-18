SELECT cost_usd, timestamp
FROM traces
WHERE service_name = $1
  AND endpoint = $2
  AND timestamp >= $3
  AND status = 'success'
ORDER BY timestamp DESC