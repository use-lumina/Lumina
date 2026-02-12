import { notFound } from 'next/navigation';
import { getTraceById, type Trace } from '@/lib/api';
import { TraceDetail } from '@/components/traces/trace-detail';
import type { UITrace, HierarchicalSpan } from '@/types/trace';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

function mapTraceToHierarchicalSpan(trace: Trace): HierarchicalSpan {
  return {
    trace_id: trace.trace_id,
    span_id: trace.span_id,
    parent_span_id: trace.parent_span_id,
    service_name: trace.service_name,
    endpoint: trace.endpoint,
    model: trace.model,
    status: trace.status,
    latency_ms: trace.latency_ms,
    cost_usd: trace.cost_usd,
    prompt_tokens: trace.prompt_tokens,
    completion_tokens: trace.completion_tokens,
    prompt: trace.prompt,
    response: trace.response,
    timestamp: trace.timestamp,
    environment: trace.environment,
    children: trace.children.map(mapTraceToHierarchicalSpan),
  };
}

function mapApiTraceToUI(trace: Trace): UITrace {
  return {
    id: trace.trace_id,
    service: trace.service_name,
    endpoint: trace.endpoint,
    model: trace.model,
    status:
      trace.status === 'ok' || trace.status === 'healthy'
        ? 'healthy'
        : (trace.status as 'healthy' | 'degraded' | 'error'),
    latencyMs: trace.latency_ms,
    costUsd: trace.cost_usd ?? 0,
    createdAt: trace.timestamp,
    prompt: trace.prompt,
    response: trace.response,
    spans: (trace.metadata as any)?.spans,
    hierarchicalSpan: mapTraceToHierarchicalSpan(trace),
    metadata: {
      tokensIn: trace.prompt_tokens,
      tokensOut: trace.completion_tokens,
      temperature: trace.metadata?.temperature,
      userId: trace.metadata?.userId || trace.customer_id,
      sessionId: trace.metadata?.sessionId,
      ...trace.metadata,
    },
  };
}

export default async function TraceDetailPage({ params }: Params) {
  const { id } = await params;

  try {
    const data = await getTraceById(id);

    if (!data || !data.trace) {
      return notFound();
    }

    const uiTrace = mapApiTraceToUI(data.trace);

    return (
      <div className="p-6">
        <TraceDetail trace={uiTrace} />
      </div>
    );
  } catch (err) {
    console.error('Failed to load trace:', err);
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-100 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Trace not found</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Unable to fetch trace details. The trace may not exist or there was an error loading
              it.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
