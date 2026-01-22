// Inlined types from @lumina/schema and @lumina/config for standalone npm package

export interface Trace {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  timestamp: string | Date;
  service_name: string;
  endpoint: string;
  environment: string;
  provider?: string;
  model: string;
  prompt: string;
  response: string;
  response_hash?: string;
  tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  latency_ms: number;
  cost_usd: number;
  status?: 'success' | 'error';
  error_message?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  customer_id?: string;
}

export interface Alert {
  alert_id: string;
  trace_id: string;
  service_name: string;
  endpoint: string;
  alert_type: 'cost_spike' | 'quality_drop' | 'cost_and_quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  baseline_value?: number;
  current_value: number;
  threshold: number;
  created_at: string;
  resolved_at?: string;
}

export interface IngestRequest {
  traces: Trace[];
}

export interface IngestResponse {
  success: boolean;
  traces_received: number;
  errors?: string[];
}

export interface SdkConfig {
  api_key?: string;
  endpoint: string;
  service_name?: string;
  customer_id?: string;
  environment: 'live' | 'test';
  enabled: boolean;
  batch_size: number;
  batch_interval_ms: number;
  flush_interval_ms?: number;
  timeout_ms: number;
  max_retries: number;
}
