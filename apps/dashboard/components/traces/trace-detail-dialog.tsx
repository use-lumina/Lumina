'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpanTimeline } from './trace-timeline';

import { Clock, DollarSign, User, Hash } from 'lucide-react';
import type { UITrace } from '@/types/trace';

interface TraceDetailDialogProps {
  trace: UITrace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TraceDetailDialog({ trace, open, onOpenChange }: TraceDetailDialogProps) {
  if (!trace) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-(--sidebar-border)">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Trace Details</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {trace.id}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {trace.service} • {trace.endpoint}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border border-(--sidebar-border) bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                <span>Latency</span>
              </div>
              <p className="text-lg font-semibold">{trace.latencyMs}ms</p>
            </div>

            <div className="rounded-lg border border-(--sidebar-border) border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span>Cost</span>
              </div>
              <p className="text-lg font-semibold">${trace.costUsd.toFixed(4)}</p>
            </div>

            <div className="rounded-lg border border-(--sidebar-border) border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Hash className="h-3 w-3" />
                <span>Model</span>
              </div>
              <p className="text-lg font-semibold">{trace.model}</p>
            </div>

            <div className="rounded-lg border border-(--sidebar-border) border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span>Status</span>
              </div>
              <Badge variant={trace.status === 'success' ? 'success' : 'destructive'}>
                {trace.status}
              </Badge>
            </div>
          </div>

          {/* Span Timeline */}
          {trace.spans && trace.spans.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Execution Timeline</h3>
              <div className="rounded-lg border border-border border-(--sidebar-border) bg-card p-4">
                <SpanTimeline spans={trace.spans} totalDuration={trace.latencyMs} />
              </div>
            </div>
          )}

          {/* Tabs for prompt/response/metadata */}
          <Tabs defaultValue="prompt" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="prompt"
                className="
                  cursor-pointer
                  border-b border-(--sidebar-border)
                  data-[state=active]:border-b-2
                  data-[state=active]:border-primary
                  data-[state=active]:text-primary
                "
              >
                Prompt
              </TabsTrigger>

              <TabsTrigger
                value="response"
                className="
                  cursor-pointer
                  border-b border-(--sidebar-border)
                  data-[state=active]:border-b-2
                  data-[state=active]:border-primary
                  data-[state=active]:text-primary
                "
              >
                Response
              </TabsTrigger>

              <TabsTrigger
                value="metadata"
                className="
                cursor-pointer
                border-b border-(--sidebar-border)
                data-[state=active]:border-b-2
                data-[state=active]:border-primary
                data-[state=active]:text-primary
              "
              >
                Metadata
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="mt-4">
              <div className="rounded-lg border border-(--sidebar-border) border-border bg-muted p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {trace.prompt || 'No prompt data available'}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="response" className="mt-4">
              <div className="rounded-lg border border-(--sidebar-border) border-border bg-muted p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {trace.response || 'No response data available'}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <div className="rounded-lg border border-(--sidebar-border) border-border bg-card p-4">
                <dl className="grid grid-cols-2 gap-4">
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
                  <dd className="text-sm font-mono">
                    {new Date(trace.createdAt).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
