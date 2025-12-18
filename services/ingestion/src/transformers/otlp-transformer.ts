import type { ParsedOTLPSpan, Trace, OTLPStatusCode } from '@lumina/schema';
import { getStringAttribute, getNumberAttribute } from '../parsers/otlp-parser';
import { calculateCost } from '@lumina/core';

/**
 * Transform OTLP span to Lumina Trace format
 */
export function transformOTLPToTrace(span: ParsedOTLPSpan, customerId: string): Trace {
  // Calculate duration in milliseconds
  const startTimeMs = Number(span.startTimeUnixNano) / 1_000_000;
  const endTimeMs = Number(span.endTimeUnixNano) / 1_000_000;
  const latencyMs = endTimeMs - startTimeMs;

  // Extract LLM-specific attributes (using gen_ai.* semantic conventions)
  const llmSystem = getStringAttribute(span, 'gen_ai.system', 'unknown');
  const requestModel = getStringAttribute(span, 'gen_ai.request.model', '');
  const responseModel = getStringAttribute(span, 'gen_ai.response.model', '');
  const model = responseModel || requestModel || 'unknown';

  const prompt = getStringAttribute(span, 'gen_ai.prompt', '');
  const completion = getStringAttribute(span, 'gen_ai.completion', '');

  const promptTokens = getNumberAttribute(span, 'gen_ai.usage.prompt_tokens', 0);
  const completionTokens = getNumberAttribute(span, 'gen_ai.usage.completion_tokens', 0);
  const totalTokens = getNumberAttribute(
    span,
    'gen_ai.usage.total_tokens',
    promptTokens + completionTokens
  );

  // Extract Lumina-specific attributes
  const environment = getStringAttribute(span, 'lumina.environment', 'live') as 'live' | 'test';
  const providedCost = getNumberAttribute(span, 'lumina.cost_usd', 0);

  // Calculate cost if not provided
  const costUsd =
    providedCost > 0
      ? providedCost
      : calculateCost({
          model,
          promptTokens: promptTokens || undefined,
          completionTokens: completionTokens || undefined,
          totalTokens,
        });

  const tags = parseTagsAttribute(span);

  // Extract service information from resource attributes
  const serviceName = getStringAttribute(
    { ...span, attributes: span.resourceAttributes },
    'service.name',
    'unknown-service'
  );

  // Extract metadata (non-standard attributes)
  const metadata = extractMetadata(span);

  // Map OTLP status to Lumina status
  const status = mapOTLPStatus(span.status.code as OTLPStatusCode);
  const errorMessage = span.status.message || undefined;

  return {
    // Identifiers
    trace_id: span.traceId,
    span_id: span.spanId,
    parent_span_id: span.parentSpanId || undefined,
    customer_id: customerId,

    // Timestamps
    timestamp: new Date(startTimeMs),

    // Service context
    service_name: serviceName,
    endpoint: span.name,
    environment,

    // Model information
    model,
    provider: mapLLMSystemToProvider(llmSystem),

    // Request/Response
    prompt,
    response: completion,

    // Metrics
    tokens: totalTokens,
    prompt_tokens: promptTokens || undefined,
    completion_tokens: completionTokens || undefined,
    latency_ms: latencyMs,
    cost_usd: costUsd,

    // Metadata
    metadata,
    tags,

    // Status
    status,
    error_message: errorMessage,
  };
}

/**
 * Map OTLP status code to Lumina status
 */
function mapOTLPStatus(code: OTLPStatusCode): 'success' | 'error' {
  // STATUS_CODE_ERROR = 2
  return code === 2 ? 'error' : 'success';
}

/**
 * Map LLM system to provider enum
 */
function mapLLMSystemToProvider(
  system: string
): 'openai' | 'anthropic' | 'cohere' | 'other' | undefined {
  const normalized = system.toLowerCase();

  if (normalized.includes('openai') || normalized === 'openai') {
    return 'openai';
  }
  if (normalized.includes('anthropic') || normalized === 'anthropic') {
    return 'anthropic';
  }
  if (normalized.includes('cohere') || normalized === 'cohere') {
    return 'cohere';
  }
  if (normalized === 'unknown' || !normalized) {
    return undefined;
  }

  return 'other';
}

/**
 * Parse tags attribute (stored as JSON string)
 */
function parseTagsAttribute(span: ParsedOTLPSpan): string[] | undefined {
  const tagsValue = span.attributes['lumina.tags'];

  if (!tagsValue) {
    return undefined;
  }

  // If it's already an array
  if (Array.isArray(tagsValue)) {
    return tagsValue.filter((t) => typeof t === 'string');
  }

  // If it's a JSON string
  if (typeof tagsValue === 'string') {
    try {
      const parsed = JSON.parse(tagsValue);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Extract metadata from span attributes
 * Excludes standard OTEL and Lumina attributes
 */
function extractMetadata(span: ParsedOTLPSpan): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};

  const excludedPrefixes = ['gen_ai.', 'lumina.', 'service.', 'telemetry.'];

  for (const [key, value] of Object.entries(span.attributes)) {
    // Skip if it matches excluded prefixes
    const shouldExclude = excludedPrefixes.some((prefix) => key.startsWith(prefix));

    if (!shouldExclude) {
      metadata[key] = value;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Batch transform multiple OTLP spans
 */
export function transformOTLPBatch(spans: ParsedOTLPSpan[], customerId: string): Trace[] {
  return spans.map((span) => transformOTLPToTrace(span, customerId));
}
