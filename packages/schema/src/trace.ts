import { z } from 'zod';

/**
 * Trace Schema
 * Represents a single LLM API call with all relevant metadata
 */
export const TraceSchema = z.object({
  // Identifiers
  trace_id: z.string().min(1),
  customer_id: z.string().min(1),

  // Timestamps
  timestamp: z.coerce.date(),

  // Service context
  service_name: z.string().min(1),
  endpoint: z.string().min(1),
  environment: z.enum(['live', 'test']).default('live'),

  // Model information
  model: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'cohere', 'other']).optional(),

  // Request/Response
  prompt: z.string(),
  response: z.string(),
  response_hash: z.string().optional(), // For quality comparison

  // Metrics
  tokens: z.number().int().nonnegative(),
  prompt_tokens: z.number().int().nonnegative().optional(),
  completion_tokens: z.number().int().nonnegative().optional(),
  latency_ms: z.number().nonnegative(),
  cost_usd: z.number().nonnegative(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),

  // Status
  status: z.enum(['success', 'error']).default('success'),
  error_message: z.string().optional(),
});

export type Trace = z.infer<typeof TraceSchema>;

/**
 * Span Schema
 * Represents a sub-operation within a trace (e.g., retrieval, generation)
 */
export const SpanSchema = z.object({
  span_id: z.string().min(1),
  trace_id: z.string().min(1),
  parent_span_id: z.string().optional(),

  name: z.string().min(1),
  type: z.enum(['retrieval', 'generation', 'embedding', 'other']),

  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  duration_ms: z.number().nonnegative(),

  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['success', 'error']).default('success'),
  error_message: z.string().optional(),
});

export type Span = z.infer<typeof SpanSchema>;

/**
 * Cost Baseline Schema
 * Stores historical cost baselines for anomaly detection
 */
export const CostBaselineSchema = z.object({
  baseline_id: z.string().min(1),
  customer_id: z.string().min(1),
  service_name: z.string().min(1),
  endpoint: z.string().min(1),

  window: z.enum(['1h', '24h', '7d']),

  // Percentiles
  p50_cost: z.number().nonnegative(),
  p95_cost: z.number().nonnegative(),
  p99_cost: z.number().nonnegative(),

  // Additional metrics
  avg_cost: z.number().nonnegative(),
  sample_count: z.number().int().nonnegative(),

  calculated_at: z.coerce.date(),
  last_updated: z.coerce.date(),
});

export type CostBaseline = z.infer<typeof CostBaselineSchema>;

/**
 * Ingest Request Schema
 * Payload sent from SDK to ingestion service
 */
export const IngestRequestSchema = z.object({
  traces: z.array(TraceSchema).min(1).max(100), // Batch up to 100 traces
  spans: z.array(SpanSchema).optional(),
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;

/**
 * Ingest Response Schema
 */
export const IngestResponseSchema = z.object({
  success: z.boolean(),
  accepted: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative().optional(),
  errors: z.array(z.string()).optional(),
});

export type IngestResponse = z.infer<typeof IngestResponseSchema>;
