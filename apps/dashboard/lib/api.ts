/**
 * API Client for Lumina Dashboard
 * Connects to the Lumina Query API Service
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// Cookie-based auth: httpOnly cookie will be sent with `credentials: 'include'`.
function buildHeaders() {
  // No Authorization header by default. If you need to add headers,
  // update this helper to include them (but avoid storing tokens in JS).
  return {} as Record<string, string>;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

interface TimeRangeParams {
  startTime?: string;
  endTime?: string;
}

// ============================================================================
// Traces API
// ============================================================================

export interface TraceFilters extends PaginationParams, TimeRangeParams {
  service?: string;
  endpoint?: string;
  model?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface Trace {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  customer_id: string;
  service_name: string;
  endpoint: string;
  model: string;
  status: string;
  latency_ms: number;
  cost_usd?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  timestamp: string;
  environment?: string;
  prompt?: string;
  response?: string;
  metadata?: any;
  children: Trace[];
}

export interface TracesResponse {
  data: Trace[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface TraceDetailResponse {
  trace: Trace;
  alerts: Alert[];
}

export async function getTraces(filters?: TraceFilters): Promise<TracesResponse> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/traces?${params}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch traces: ${response.statusText}`);
  }

  return response.json();
}

export async function getTraceById(id: string): Promise<TraceDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/traces/${id}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trace: ${response.statusText}`);
  }

  return response.json();
}

export interface TraceTrendsParams extends TimeRangeParams {
  service?: string;
  endpoint?: string;
  model?: string;
  status?: string;
}

export interface TraceTrendsResponse {
  current: {
    totalRequests: number;
    avgLatency: number;
    totalCost: number;
    errorRate: number;
  };
  previous: {
    totalRequests: number;
    avgLatency: number;
    totalCost: number;
    errorRate: number;
  };
  trends: {
    requestsTrend: number;
    latencyTrend: number;
    costTrend: number;
    errorRateTrend: number;
  };
  timeRange: {
    current: {
      startTime: string;
      endTime: string;
    };
    previous: {
      startTime: string;
      endTime: string;
    };
  };
}

export async function getTraceTrends(params?: TraceTrendsParams): Promise<TraceTrendsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/traces/trends?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trace trends: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Cost/Analytics API
// ============================================================================

export interface CostTimelineParams extends TimeRangeParams {
  service?: string;
  endpoint?: string;
  model?: string;
  granularity?: 'hour' | 'day' | 'week';
}

export interface CostTimelineDataPoint {
  time_bucket: string;
  request_count: number;
  total_cost: number;
  avg_cost: number;
  min_cost: number;
  max_cost: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
}

export interface CostTimelineResponse {
  data: CostTimelineDataPoint[];
  filters: {
    service?: string;
    endpoint?: string;
    model?: string;
    startTime: string;
    endTime: string;
    granularity: string;
  };
}

export async function getCostTimeline(params?: CostTimelineParams): Promise<CostTimelineResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/cost/timeline?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cost timeline: ${response.statusText}`);
  }

  return response.json();
}

export interface CostBreakdownParams extends TimeRangeParams {
  groupBy?: 'service' | 'endpoint' | 'model' | 'customer';
  limit?: number;
  offset?: number;
}

export interface CostBreakdownItem {
  group_name: string;
  request_count: number;
  total_cost: number;
  avg_cost: number;
  min_cost: number;
  max_cost: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_latency_ms: number;
  percentage: number;
}

export interface CostBreakdownResponse {
  data: CostBreakdownItem[];
  summary: {
    totalCost: number;
    groupBy: string;
    startTime: string;
    endTime: string;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getCostBreakdown(
  params?: CostBreakdownParams
): Promise<CostBreakdownResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/cost/breakdown?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cost breakdown: ${response.statusText}`);
  }

  return response.json();
}

export interface CostAnomaliesParams extends PaginationParams {
  service?: string;
  severity?: string;
}

export interface CostAnomaly {
  alert_id: string;
  trace_id: string;
  alert_type: string;
  severity: string;
  current_cost: number;
  baseline_cost: number;
  cost_increase_percent: number;
  reasoning: string;
  alert_timestamp: string;
  status: string;
  service_name: string;
  endpoint: string;
  model: string;
  cost_usd: number;
  trace_timestamp: string;
}

export interface CostAnomaliesResponse {
  data: CostAnomaly[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getCostAnomalies(
  params?: CostAnomaliesParams
): Promise<CostAnomaliesResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/cost/anomalies?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cost anomalies: ${response.statusText}`);
  }

  return response.json();
}

export type CostSummaryParams = TimeRangeParams;

export interface CostSummaryResponse {
  summary: {
    total_requests: number;
    total_cost: number;
    avg_cost: number;
    min_cost: number;
    max_cost: number;
    p50_cost: number;
    p95_cost: number;
    p99_cost: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    avg_latency_ms: number;
  };
  alerts: {
    total_alerts: number;
    high_severity: number;
    medium_severity: number;
    low_severity: number;
    acknowledged: number;
  };
  timeRange: {
    startTime: string;
    endTime: string;
  };
}

export async function getCostSummary(params?: CostSummaryParams): Promise<CostSummaryResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/cost/summary?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cost summary: ${response.statusText}`);
  }

  return response.json();
}

export interface EndpointTrendsParams extends TimeRangeParams {
  limit?: number;
}

export interface EndpointTrend {
  endpoint: string;
  request_count: number;
  total_cost: number;
  avg_cost: number;
  trend: 'up' | 'down' | 'stable';
  trend_percent: number;
  previous_cost: number;
}

export interface EndpointTrendsResponse {
  data: EndpointTrend[];
  timeRange: {
    current: {
      startTime: string;
      endTime: string;
    };
    previous: {
      startTime: string;
      endTime: string;
    };
  };
}

export async function getEndpointTrends(
  params?: EndpointTrendsParams
): Promise<EndpointTrendsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/cost/endpoint-trends?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch endpoint trends: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Alerts API
// ============================================================================

export interface AlertFilters extends PaginationParams, TimeRangeParams {
  service?: string;
  alertType?: string;
  severity?: string;
  status?: string;
}

export interface Alert {
  alert_id: string;
  trace_id: string;
  span_id: string;
  customer_id: string;
  alert_type: string;
  severity: string;
  current_cost: number;
  baseline_cost: number;
  cost_increase_percent: number;
  hash_similarity: number;
  semantic_score: number;
  scoring_method: string;
  semantic_cached: boolean;
  service_name: string;
  endpoint: string;
  model: string;
  reasoning: string;
  timestamp: string;
  status: string;
  acknowledged_at?: string;
  resolved_at?: string;
  prompt?: string;
  response?: string;
  cost_usd?: number;
  latency_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  trace_timestamp?: string;
}

export interface AlertsResponse {
  data: Alert[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getAlerts(filters?: AlertFilters): Promise<AlertsResponse> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/alerts?${params}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  return response.json();
}

export async function getAlertById(id: string): Promise<Alert> {
  const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch alert: ${response.statusText}`);
  }

  return response.json();
}

export type AlertStatsParams = TimeRangeParams;

export interface AlertStatsResponse {
  stats: {
    total_alerts: number;
    high_severity: number;
    medium_severity: number;
    low_severity: number;
    acknowledged: number;
    unacknowledged: number;
    cost_spikes: number;
    quality_drops: number;
    combined_alerts: number;
  };
  byService: Array<{
    service_name: string;
    alert_count: number;
    high_severity: number;
    unacknowledged: number;
  }>;
  timeRange: {
    startTime: string;
    endTime: string;
  };
}

export async function getAlertStats(params?: AlertStatsParams): Promise<AlertStatsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/alerts/stats?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch alert stats: ${response.statusText}`);
  }

  return response.json();
}

export async function acknowledgeAlert(id: string): Promise<{ success: boolean; alert: Alert }> {
  const response = await fetch(`${API_BASE_URL}/alerts/${id}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildHeaders() },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
  }

  return response.json();
}

export async function resolveAlert(id: string): Promise<{ success: boolean; alert: Alert }> {
  const response = await fetch(`${API_BASE_URL}/alerts/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildHeaders() },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve alert: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Replay API
// ============================================================================

const REPLAY_API_BASE_URL = process.env.NEXT_PUBLIC_REPLAY_API_URL || 'http://localhost:8082';

export interface ReplaySet {
  replay_id: string;
  name: string;
  description?: string;
  trace_ids: string[];
  created_at: string;
  created_by?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_traces: number;
  completed_traces?: number;
}

export interface ReplayResult {
  result_id: string;
  replay_id: string;
  trace_id: string;
  original_response: string;
  replay_response: string;
  original_cost: number;
  replay_cost: number;
  original_latency: number;
  replay_latency: number;
  hash_similarity: number;
  semantic_score: number;
  diff_summary: {
    cost_diff: number;
    cost_diff_percent: number;
    latency_diff: number;
    latency_diff_percent: number;
    response_changed: boolean;
  };
  executed_at: string;
  status: string;
  service_name?: string;
  endpoint?: string;
  model?: string;
  prompt?: string;
  replay_prompt?: string;
  replay_model?: string;
  replay_system_prompt?: string;
}

export interface ReplaySummary {
  total_results: number;
  avg_hash_similarity: number;
  avg_semantic_score: number;
  avg_cost_diff: number;
  avg_latency_diff: number;
  response_changes: number;
}

export interface CreateReplaySetParams {
  name: string;
  description?: string;
  traceIds: string[];
  createdBy?: string;
}

export interface ReplaySetsResponse {
  data: ReplaySet[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ReplayDetailsResponse {
  replaySet: ReplaySet;
  summary: ReplaySummary | null;
}

export interface ReplayDiffResponse {
  data: ReplayResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function createReplaySet(
  params: CreateReplaySetParams
): Promise<{ success: boolean; replaySet: ReplaySet }> {
  const response = await fetch(`${REPLAY_API_BASE_URL}/replay/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to create replay set: ${response.statusText}`);
  }

  return response.json();
}

export async function runReplay(
  replayId: string
): Promise<{ success: boolean; replayId: string; completedCount: number; totalTraces: number }> {
  const response = await fetch(`${REPLAY_API_BASE_URL}/replay/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ replayId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to run replay: ${response.statusText}`);
  }

  return response.json();
}

export async function getReplaySets(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ReplaySetsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${REPLAY_API_BASE_URL}/replay?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch replay sets: ${response.statusText}`);
  }

  return response.json();
}

export async function getReplayDetails(replayId: string): Promise<ReplayDetailsResponse> {
  const response = await fetch(`${REPLAY_API_BASE_URL}/replay/${replayId}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch replay details: ${response.statusText}`);
  }

  return response.json();
}

export async function getReplayDiff(
  replayId: string,
  params?: { limit?: number; offset?: number; showOnlyChanges?: boolean }
): Promise<ReplayDiffResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${REPLAY_API_BASE_URL}/replay/${replayId}/diff?${queryParams}`, {
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch replay diff: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteReplaySet(
  replayId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${REPLAY_API_BASE_URL}/replay/${replayId}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete replay set: ${response.statusText}`);
  }

  return response.json();
}
