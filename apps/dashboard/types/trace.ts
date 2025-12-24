export type TraceSpan = {
  name: string;
  startMs: number;
  durationMs: number;
  type: 'retrieval' | 'generation' | 'processing';
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
  metadata?: {
    tokensIn?: number;
    tokensOut?: number;
    temperature?: number;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
};
