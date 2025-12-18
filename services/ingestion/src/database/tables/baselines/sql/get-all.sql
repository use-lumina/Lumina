SELECT * FROM cost_baselines
WHERE service_name = $1
  AND endpoint = $2
ORDER BY window_size