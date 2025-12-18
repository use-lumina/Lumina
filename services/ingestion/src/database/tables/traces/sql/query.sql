SELECT * FROM traces
WHERE customer_id = $1
  AND ($2::text IS NULL OR environment = $2)
  AND ($3::timestamptz IS NULL OR timestamp >= $3)
  AND ($4::timestamptz IS NULL OR timestamp <= $4)
  AND ($5::text IS NULL OR status = $5)
  AND ($6::text IS NULL OR service_name = $6)
ORDER BY timestamp DESC
LIMIT $7
OFFSET $8