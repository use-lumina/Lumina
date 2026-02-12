'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpanTimeline } from './trace-timeline';
import { SpanTree } from './span-tree';
import { Clock, DollarSign, User, Hash } from 'lucide-react';
import type { UITrace, HierarchicalSpan } from '@/types/trace';

interface TraceDetailProps {
  trace: UITrace;
}

export function TraceDetail({ trace }: TraceDetailProps) {
  // Track the selected span (defaults to root/parent span)
  const [selectedSpan, setSelectedSpan] = useState<HierarchicalSpan | null>(
    trace.hierarchicalSpan || null
  );

  // Use selected span data or fallback to trace data
  const displayData = selectedSpan
    ? {
        service: selectedSpan.service_name,
        endpoint: selectedSpan.endpoint,
        model: selectedSpan.model,
        latencyMs: selectedSpan.latency_ms,
        costUsd: selectedSpan.cost_usd ?? 0,
        prompt: selectedSpan.prompt,
        response: selectedSpan.response,
        promptTokens: selectedSpan.prompt_tokens,
        completionTokens: selectedSpan.completion_tokens,
        status: selectedSpan.status,
      }
    : {
        service: trace.service,
        endpoint: trace.endpoint,
        model: trace.model,
        latencyMs: trace.latencyMs,
        costUsd: trace.costUsd,
        prompt: trace.prompt,
        response: trace.response,
        promptTokens: trace.metadata?.tokensIn,
        completionTokens: trace.metadata?.tokensOut,
        status: trace.status,
      };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">Trace Details</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            {trace.id}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {displayData.service} • {displayData.endpoint}
        </p>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>Latency</span>
          </div>
          <p className="text-2xl font-semibold">{displayData.latencyMs}ms</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span>Cost</span>
          </div>
          <p className="text-2xl font-semibold">${displayData.costUsd.toFixed(4)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Hash className="h-4 w-4" />
            <span>Model</span>
          </div>
          <p className="text-2xl font-semibold">{displayData.model}</p>
        </div>

        <div className="rounded-lg border border-(--border) bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <User className="h-4 w-4" />
            <span>Status</span>
          </div>
          <Badge
            variant={
              displayData.status === 'healthy' || displayData.status === 'success'
                ? 'success'
                : displayData.status === 'degraded'
                  ? 'warning'
                  : 'destructive'
            }
          >
            {displayData.status}
          </Badge>
        </div>
      </div>

      {/* Hierarchical Span Tree or Span Timeline */}
      {trace.hierarchicalSpan ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Span Hierarchy</h3>
          <div className="rounded-lg border border-border bg-card p-6">
            <SpanTree
              span={trace.hierarchicalSpan}
              selectedSpanId={selectedSpan?.span_id}
              onSpanSelect={setSelectedSpan}
            />
          </div>
        </div>
      ) : trace.spans && trace.spans.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Execution Timeline</h3>
          <div className="rounded-lg border border-border bg-card p-6">
            <SpanTimeline spans={trace.spans} totalDuration={trace.latencyMs} />
          </div>
        </div>
      ) : null}

      {/* Tabs for prompt/response/metadata */}
      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-4">
          <div className="rounded-lg border border-(--sidebar-border) bg-muted p-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {displayData.prompt || 'No prompt data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="response" className="mt-4">
          <div className="rounded-lg border border-(--sidebar-border) bg-muted p-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {displayData.response || 'No response data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <div className="rounded-lg border border-(--sidebar-border) bg-card p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayData.promptTokens !== undefined && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Tokens In</dt>
                  <dd className="text-sm font-mono">{displayData.promptTokens}</dd>
                </>
              )}
              {displayData.completionTokens !== undefined && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Tokens Out</dt>
                  <dd className="text-sm font-mono">{displayData.completionTokens}</dd>
                </>
              )}
              <dt className="text-sm font-medium text-muted-foreground">Service</dt>
              <dd className="text-sm font-mono">{displayData.service}</dd>
              <dt className="text-sm font-medium text-muted-foreground">Endpoint</dt>
              <dd className="text-sm font-mono">{displayData.endpoint}</dd>
              <dt className="text-sm font-medium text-muted-foreground">Model</dt>
              <dd className="text-sm font-mono">{displayData.model}</dd>
              <dt className="text-sm font-medium text-muted-foreground">Latency</dt>
              <dd className="text-sm font-mono">{displayData.latencyMs}ms</dd>
              <dt className="text-sm font-medium text-muted-foreground">Cost</dt>
              <dd className="text-sm font-mono">${displayData.costUsd.toFixed(6)}</dd>
              {selectedSpan && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Span ID</dt>
                  <dd className="text-sm font-mono">{selectedSpan.span_id}</dd>
                </>
              )}
              <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
              <dd className="text-sm font-mono">{new Date(trace.createdAt).toLocaleString()}</dd>
            </dl>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
