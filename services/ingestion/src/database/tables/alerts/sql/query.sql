SELECT *
FROM alerts
WHERE customer_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR alert_type = $3)
  AND ($4::text IS NULL OR severity = $4)
  AND ($5::text IS NULL OR service_name = $5)
  AND ($6::timestamptz IS NULL OR timestamp >= $6)
  AND ($7::timestamptz IS NULL OR timestamp <= $7)
ORDER BY timestamp DESC
LIMIT $8
OFFSET $9