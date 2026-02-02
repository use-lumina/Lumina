export type TraceSpan = {
  name: string;
  startMs: number;
  durationMs: number;
  type: 'retrieval' | 'generation' | 'processing';
};

// Hierarchical span type (from API)
export type HierarchicalSpan = {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  service_name: string;
  endpoint: string;
  model: string;
  status: string;
  latency_ms: number;
  cost_usd?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt?: string;
  response?: string;
  timestamp: string;
  environment?: string;
  children: HierarchicalSpan[];
};

// UI Trace type (used by components)
export type UITrace = {
  id: string;
  service: string;
  endpoint: string;
  model: string;
  status: 'healthy' | 'degraded' | 'error';
  latencyMs: number;
  costUsd: number;
  createdAt: string;
  prompt?: string;
  response?: string;
  spans?: TraceSpan[];
  hierarchicalSpan?: HierarchicalSpan;
  metadata?: {
    tokensIn?: number;
    tokensOut?: number;
    temperature?: number;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
};
