import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpanTimeline } from './trace-timeline';
import { Clock, DollarSign, User, Hash } from 'lucide-react';
import type { UITrace } from '@/types/trace';

interface TraceDetailProps {
  trace: UITrace;
}

export function TraceDetail({ trace }: TraceDetailProps) {
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
          {trace.service} • {trace.endpoint}
        </p>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>Latency</span>
          </div>
          <p className="text-2xl font-semibold">{trace.latencyMs}ms</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span>Cost</span>
          </div>
          <p className="text-2xl font-semibold">${trace.costUsd.toFixed(4)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Hash className="h-4 w-4" />
            <span>Model</span>
          </div>
          <p className="text-2xl font-semibold">{trace.model}</p>
        </div>

        <div className="rounded-lg border border-(--border) bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <User className="h-4 w-4" />
            <span>Status</span>
          </div>
          <Badge
            variant={
              trace.status === 'healthy'
                ? 'success'
                : trace.status === 'degraded'
                  ? 'warning'
                  : 'destructive'
            }
          >
            {trace.status}
          </Badge>
        </div>
      </div>

      {/* Span Timeline */}
      {trace.spans && trace.spans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Execution Timeline</h3>
          <div className="rounded-lg border border-border bg-card p-6">
            <SpanTimeline spans={trace.spans} totalDuration={trace.latencyMs} />
          </div>
        </div>
      )}

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
              {trace.prompt || 'No prompt data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="response" className="mt-4">
          <div className="rounded-lg border border-(--sidebar-border) bg-muted p-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {trace.response || 'No response data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <div className="rounded-lg border border-(--sidebar-border) bg-card p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trace.metadata?.userId && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                  <dd className="text-sm font-mono">{trace.metadata.userId}</dd>
                </>
              )}
              {trace.metadata?.sessionId && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Session ID</dt>
                  <dd className="text-sm font-mono">{trace.metadata.sessionId}</dd>
                </>
              )}
              {trace.metadata?.tokensIn !== undefined && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Tokens In</dt>
                  <dd className="text-sm font-mono">{trace.metadata.tokensIn}</dd>
                </>
              )}
              {trace.metadata?.tokensOut !== undefined && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Tokens Out</dt>
                  <dd className="text-sm font-mono">{trace.metadata.tokensOut}</dd>
                </>
              )}
              {trace.metadata?.temperature !== undefined && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Temperature</dt>
                  <dd className="text-sm font-mono">{trace.metadata.temperature}</dd>
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
