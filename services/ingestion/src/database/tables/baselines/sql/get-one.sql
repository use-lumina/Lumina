SELECT * FROM cost_baselines
WHERE service_name = $1
  AND endpoint = $2
  AND window_size = $3