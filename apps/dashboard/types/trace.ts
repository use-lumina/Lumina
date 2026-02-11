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

export type Evaluation = {
  id: string;
  evaluator: string;
  score: number;
  reasoning?: string;
  createdAt: string;
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
  evaluations?: Evaluation[];
  release?: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  metadata?: {
    tokensIn?: number;
    tokensOut?: number;
    temperature?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
};
