UPDATE alerts
SET
  status = $2,
  acknowledged_at = $3,
  resolved_at = $4
WHERE alert_id = $1