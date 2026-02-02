'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { SpanTimeline } from './trace-timeline';
import { SpanTree } from './span-tree';
import { Clock, DollarSign, User, Hash, Copy, Check, WrapText, Code2, X } from 'lucide-react';
import type { UITrace } from '@/types/trace';

interface TraceDetailDrawerProps {
  trace: UITrace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TraceDetailDrawer({ trace, open, onOpenChange }: TraceDetailDrawerProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [wrapPrompt, setWrapPrompt] = useState(true);
  const [wrapResponse, setWrapResponse] = useState(true);

  const copyToClipboard = async (text: string, type: 'prompt' | 'response') => {
    await navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  if (!trace) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="focus:outline-none border-(--border)">
        <div className="mx-auto w-full h-full overflow-y-auto">
          <div className="space-y-6 p-6 pb-12">
            {/* Header */}
            <DrawerHeader className="p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DrawerTitle>Trace Details</DrawerTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {trace.id}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DrawerDescription className="text-left">
                {trace.service} • {trace.endpoint}
              </DrawerDescription>
            </DrawerHeader>

            {/* Metadata cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-(--accent) border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  <span>Latency</span>
                </div>
                <p className="text-2xl font-semibold">{trace.latencyMs}ms</p>
              </div>

              <div className="rounded-lg border border-(--accent) border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Cost</span>
                </div>
                <p className="text-2xl font-semibold">
                  ${typeof trace.costUsd === 'number' ? trace.costUsd.toFixed(4) : '0.0000'}
                </p>
              </div>

              <div className="rounded-lg border border-(--accent) border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Hash className="h-4 w-4" />
                  <span>Model</span>
                </div>
                <p className="text-xl font-semibold">{trace.model}</p>
              </div>

              <div className="rounded-lg border  border-(--accent) border-border bg-card p-4">
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

            {/* Span Timeline or Hierarchical Tree */}
            {trace.hierarchicalSpan ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Span Hierarchy</h3>
                <div className="rounded-lg border border-(--accent) border-border bg-card p-6">
                  <SpanTree span={trace.hierarchicalSpan} />
                </div>
              </div>
            ) : trace.spans && trace.spans.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Execution Timeline</h3>
                <div className="rounded-lg border border-(--accent) border-border bg-card p-6">
                  <SpanTimeline spans={trace.spans} totalDuration={trace.latencyMs} />
                </div>
              </div>
            ) : null}

            {/* Enhanced Tabs for prompt/response/metadata */}
            <Tabs defaultValue="prompt" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                <TabsTrigger
                  value="prompt"
                  className="flex-col  items-start gap-1 py-3 data-[state=active]:bg-background"
                >
                  <span className="font-medium">Prompt</span>
                  {trace.metadata?.tokensIn !== undefined && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {typeof trace.metadata.tokensIn === 'number'
                        ? trace.metadata.tokensIn.toLocaleString()
                        : ''}{' '}
                      tokens
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="response"
                  className="flex-col items-start gap-1 py-3 data-[state=active]:bg-background"
                >
                  <span className="font-medium">Response</span>
                  {trace.metadata?.tokensOut !== undefined && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {typeof trace.metadata.tokensOut === 'number'
                        ? trace.metadata.tokensOut.toLocaleString()
                        : ''}{' '}
                      tokens
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="metadata"
                  className="flex-col items-start gap-1 py-3 data-[state=active]:bg-background"
                >
                  <span className="font-medium">Metadata</span>
                  <span className="text-xs text-muted-foreground font-normal">{trace.model}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="mt-6 animate-fade-in">
                <div className="rounded-lg border border-(--accent) bg-card overflow-hidden">
                  {/* Header with actions */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Input Prompt</span>
                      {trace.metadata?.tokensIn !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {typeof trace.metadata.tokensIn === 'number'
                            ? trace.metadata.tokensIn.toLocaleString()
                            : ''}{' '}
                          tokens
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => setWrapPrompt(!wrapPrompt)}
                      >
                        <WrapText className="h-3.5 w-3.5" />
                        <span className="text-xs">{wrapPrompt ? 'Nowrap' : 'Wrap'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => copyToClipboard(trace.prompt || '', 'prompt')}
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="max-h-100 overflow-auto bg-muted/50">
                    <pre
                      className={`p-6 text-sm font-mono leading-relaxed ${
                        wrapPrompt ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'
                      }`}
                    >
                      {trace.prompt || 'No prompt data available'}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="response" className="mt-6 animate-fade-in">
                <div className="rounded-lg border border-(--accent) bg-card overflow-hidden">
                  {/* Header with actions */}
                  <div className="flex items-center border-(--border) justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">AI Response</span>
                      {trace.metadata?.tokensOut !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {typeof trace.metadata.tokensOut === 'number'
                            ? trace.metadata.tokensOut.toLocaleString()
                            : ''}{' '}
                          tokens
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => setWrapResponse(!wrapResponse)}
                      >
                        <WrapText className="h-3.5 w-3.5" />
                        <span className="text-xs">{wrapResponse ? 'Nowrap' : 'Wrap'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => copyToClipboard(trace.response || '', 'response')}
                      >
                        {copiedResponse ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="max-h-100 overflow-auto bg-muted/50">
                    <pre
                      className={`p-6 text-sm font-mono leading-relaxed ${
                        wrapResponse ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'
                      }`}
                    >
                      {trace.response || 'No response data available'}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="mt-6 animate-fade-in">
                <div className="rounded-lg border border-(--accent) bg-card overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-(--border) border-border bg-muted/30">
                    <h3 className="text-sm font-medium">Trace Metadata</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Complete details about this trace execution
                    </p>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Token & Cost Information */}
                    {(trace.metadata?.tokensIn !== undefined ||
                      trace.metadata?.tokensOut !== undefined) && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Token Usage & Cost
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {trace.metadata?.tokensIn !== undefined && (
                            <div className="rounded-lg border-(--border) border border-border bg-muted/30 p-4">
                              <p className="text-xs text-muted-foreground mb-1">Input Tokens</p>
                              <p className="text-2xl font-semibold font-mono">
                                {typeof trace.metadata.tokensIn === 'number'
                                  ? trace.metadata.tokensIn.toLocaleString()
                                  : ''}
                              </p>
                            </div>
                          )}
                          {trace.metadata?.tokensOut !== undefined && (
                            <div className="rounded-lg border border-(--border) border-border bg-muted/30 p-4">
                              <p className="text-xs text-muted-foreground mb-1">Output Tokens</p>
                              <p className="text-2xl font-semibold font-mono">
                                {typeof trace.metadata.tokensOut === 'number'
                                  ? trace.metadata.tokensOut.toLocaleString()
                                  : ''}
                              </p>
                            </div>
                          )}
                          {trace.metadata?.tokensIn !== undefined &&
                            trace.metadata?.tokensOut !== undefined && (
                              <div
                                className="rounded-lg  border-(--border)
                              border border-border bg-muted/30 p-4 md:col-span-2"
                              >
                                <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                                <p className="text-2xl font-semibold font-mono">
                                  {typeof trace.metadata.tokensIn === 'number' &&
                                  typeof trace.metadata.tokensOut === 'number'
                                    ? (
                                        trace.metadata.tokensIn + trace.metadata.tokensOut
                                      ).toLocaleString()
                                    : ''}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Model Configuration */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Model Configuration
                      </h4>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                          <dt className="text-sm text-muted-foreground">Model</dt>
                          <dd className="text-sm font-mono font-medium">{trace.model}</dd>
                        </div>
                        {trace.metadata?.temperature !== undefined && (
                          <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                            <dt className="text-sm text-muted-foreground">Temperature</dt>
                            <dd className="text-sm font-mono font-medium">
                              {trace.metadata.temperature}
                            </dd>
                          </div>
                        )}
                        <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                          <dt className="text-sm text-muted-foreground">Service</dt>
                          <dd className="text-sm font-mono font-medium">{trace.service}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b  border-(--border) border-border">
                          <dt className="text-sm text-muted-foreground">Endpoint</dt>
                          <dd className="text-sm font-mono font-medium">{trace.endpoint}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Session Information */}
                    {(trace.metadata?.userId || trace.metadata?.sessionId) && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Session Information
                        </h4>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3">
                          {trace.metadata?.userId && (
                            <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                              <dt className="text-sm text-muted-foreground">User ID</dt>
                              <dd className="text-sm font-mono font-medium">
                                {trace.metadata.userId}
                              </dd>
                            </div>
                          )}
                          {trace.metadata?.sessionId && (
                            <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                              <dt className="text-sm text-muted-foreground">Session ID</dt>
                              <dd className="text-sm font-mono font-medium">
                                {trace.metadata.sessionId}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* Timing Information */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Timing Information
                      </h4>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                          <dt className="text-sm text-muted-foreground">Created At</dt>
                          <dd className="text-sm font-mono font-medium">
                            {trace.createdAt ? new Date(trace.createdAt).toLocaleString() : ''}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-(--border) border-border">
                          <dt className="text-sm text-muted-foreground">Trace ID</dt>
                          <dd className="text-sm font-mono font-medium">{trace.id}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
