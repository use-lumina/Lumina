'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Clock, User, Tag, CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react';
import type { UITrace } from '@/types/trace';
import { cn } from '@/lib/utils';
import { TraceWaterfall } from './trace-waterfall';
import { JsonViewer } from './json-viewer';

interface TraceDetailDrawerProps {
  trace: UITrace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TraceDetailDrawer({ trace, open, onOpenChange }: TraceDetailDrawerProps) {
  if (!trace) return null;

  const getStatusIcon = (status: UITrace['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score < 0.5) return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[85vw] max-w-[1200px] ml-auto rounded-l-xl border-l border-border focus:outline-none flex flex-col">
        {/* Header */}
        <div className="flex flex-col border-b border-border bg-muted/20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(trace.status)}
              <div>
                <h2 className="text-lg font-semibold tracking-tight font-mono">{trace.endpoint}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono">{trace.id}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                    {trace.service}
                  </Badge>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                    {trace.model}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p className="font-mono font-medium">{trace.latencyMs}ms</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-mono font-medium">
                    ${typeof trace.costUsd === 'number' ? trace.costUsd.toFixed(5) : '0.00000'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tokens</p>
                  <p className="font-mono font-medium">
                    {trace.metadata?.tokensIn !== undefined
                      ? (trace.metadata.tokensIn + (trace.metadata.tokensOut || 0)).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="px-6 pt-2 border-b border-border bg-background z-10">
              <TabsList className="h-10 bg-transparent p-0 w-full justify-start gap-6">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="scores"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2"
                >
                  Scores
                </TabsTrigger>
                <TabsTrigger
                  value="metadata"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2"
                >
                  Metadata
                </TabsTrigger>
                <TabsTrigger
                  value="json"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2"
                >
                  JSON Trace
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 max-w-5xl mx-auto space-y-8">
                {/* Overview Tab */}
                <TabsContent
                  value="overview"
                  className="mt-0 space-y-8 animate-in fade-in-50 duration-300"
                >
                  {/* Waterfall */}
                  {trace.hierarchicalSpan && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Execution Timeline
                      </h3>
                      <TraceWaterfall
                        span={trace.hierarchicalSpan}
                        totalDuration={trace.latencyMs}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prompt/Input */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                        Input / Prompt
                      </h3>
                      <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                        {trace.prompt || 'No input data'}
                      </div>
                    </div>

                    {/* Response/Output */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                        Output / Response
                      </h3>
                      <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                        {trace.response || 'No output data'}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Scores Tab */}
                <TabsContent value="scores" className="mt-0 animate-in fade-in-50 duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Evaluations</h3>
                      {(!trace.evaluations || trace.evaluations.length === 0) && (
                        <div className="text-sm text-muted-foreground italic">
                          No evaluations recorded for this trace
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4">
                      {trace.evaluations?.map((evalItem) => (
                        <div
                          key={evalItem.id}
                          className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card"
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-12 h-12 rounded-full border text-lg font-bold',
                              getScoreColor(evalItem.score)
                            )}
                          >
                            {evalItem.score.toFixed(2)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{evalItem.evaluator}</h4>
                              <span className="text-xs text-muted-foreground">
                                {new Date(evalItem.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {evalItem.reasoning || 'No reasoning provided.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Metadata Tab */}
                <TabsContent value="metadata" className="mt-0 animate-in fade-in-50 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b pb-2">Context</h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[120px_1fr] items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> User ID
                          </span>
                          <span className="font-mono">{trace.userId || '-'}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Session ID
                          </span>
                          <span className="font-mono">{trace.sessionId || '-'}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Release
                          </span>
                          <span className="font-mono">{trace.release || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b pb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {trace.tags && trace.tags.length > 0 ? (
                          trace.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-mono">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No tags</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <h3 className="font-semibold text-sm border-b pb-2">Custom Metadata</h3>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground text-left">
                            <tr>
                              <th className="px-4 py-2 font-medium w-1/3">Key</th>
                              <th className="px-4 py-2 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {Object.entries(trace.metadata || {})
                              .filter(
                                ([key]) => !['tokensIn', 'tokensOut', 'temperature'].includes(key)
                              )
                              .map(([key, value]) => (
                                <tr key={key} className="hover:bg-muted/20">
                                  <td className="px-4 py-2 font-mono text-muted-foreground">
                                    {key}
                                  </td>
                                  <td className="px-4 py-2 font-mono">{String(value)}</td>
                                </tr>
                              ))}
                            {Object.keys(trace.metadata || {}).length === 0 && (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="px-4 py-8 text-center text-muted-foreground"
                                >
                                  No custom metadata
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* JSON Tab */}
                <TabsContent
                  value="json"
                  className="mt-0 animate-in fade-in-50 duration-300 h-full"
                >
                  <div className="h-[600px]">
                    <JsonViewer data={trace} />
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
