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
import { Copy, Check, WrapText, X } from 'lucide-react';
import type { UITrace } from '@/types/trace';
import { cn } from '@/lib/utils';

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
          <div className="space-y-6 pt-6 px-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <h2 className="text-xl font-semibold tracking-tight">{trace.endpoint}</h2>
                   <Badge variant="outline" className="font-mono text-xs">{trace.service}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                   <span className="font-mono text-xs">{trace.id}</span>
                   <span>•</span>
                   <span>{new Date(trace.createdAt).toLocaleString()}</span>
                </div>
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

            {/* Summary Bar */}
            <div className="flex flex-wrap gap-6 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Duration</p>
                    <p className="font-mono font-semibold text-lg">{trace.latencyMs}ms</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                    <div className="flex items-center gap-2">
                         <div className={cn("h-2 w-2 rounded-full",
                              trace.status === 'healthy' ? "bg-emerald-500" :
                              trace.status === 'degraded' ? "bg-amber-500" : "bg-red-500"
                         )} />
                         <span className="font-medium capitalize">{trace.status}</span>
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Cost</p>
                    <p className="font-mono font-semibold text-lg">${typeof trace.costUsd === 'number' ? trace.costUsd.toFixed(5) : '0.00000'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Model</p>
                    <p className="font-medium text-lg">{trace.model}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Tokens</p>
                    <p className="font-mono font-semibold text-lg">
                      {trace.metadata?.tokensIn !== undefined && trace.metadata?.tokensOut !== undefined
                        ? (trace.metadata.tokensIn + trace.metadata.tokensOut).toLocaleString()
                        : '-'}
                    </p>
                </div>
            </div>

            {/* Span Timeline or Hierarchical Tree */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trace Overview</h3>
                {trace.hierarchicalSpan ? (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <SpanTree span={trace.hierarchicalSpan} />
                </div>
                ) : trace.spans && trace.spans.length > 0 ? (
                <div className="rounded-lg border border-border bg-card p-4">
                    <SpanTimeline spans={trace.spans} totalDuration={trace.latencyMs} />
                </div>
                ) : null}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="prompt" className="w-full">
              <div className="border-b border-border">
                <TabsList className="h-auto w-full justify-start gap-6 bg-transparent p-0 rounded-none">
                  <TabsTrigger
                    value="prompt"
                    className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Prompt
                  </TabsTrigger>
                  <TabsTrigger
                    value="response"
                    className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Response
                  </TabsTrigger>
                  <TabsTrigger
                    value="metadata"
                    className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Attributes
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="prompt" className="mt-4 animate-fade-in relative group">
                  <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                       <Button variant="secondary" size="xs" onClick={() => copyToClipboard(trace.prompt || '', 'prompt')}>
                            {copiedPrompt ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedPrompt ? 'Copied' : 'Copy'}
                       </Button>
                        <Button variant="secondary" size="xs" onClick={() => setWrapPrompt(!wrapPrompt)}>
                            <WrapText className="h-3 w-3 mr-1" />
                            {wrapPrompt ? 'No Wrap' : 'Wrap'}
                        </Button>
                  </div>
                  <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                    <pre
                      className={`p-4 text-sm font-mono leading-relaxed ${
                        wrapPrompt ? 'whitespace-pre-wrap' : 'whitespace-pre'
                      }`}
                    >
                      {trace.prompt || 'No prompt data available'}
                    </pre>
                  </div>
              </TabsContent>

              <TabsContent value="response" className="mt-4 animate-fade-in relative group">
                  <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                       <Button variant="secondary" size="xs" onClick={() => copyToClipboard(trace.response || '', 'response')}>
                            {copiedResponse ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copiedResponse ? 'Copied' : 'Copy'}
                       </Button>
                        <Button variant="secondary" size="xs" onClick={() => setWrapResponse(!wrapResponse)}>
                            <WrapText className="h-3 w-3 mr-1" />
                            {wrapResponse ? 'No Wrap' : 'Wrap'}
                        </Button>
                  </div>
                  <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                    <pre
                      className={`p-4 text-sm font-mono leading-relaxed ${
                        wrapResponse ? 'whitespace-pre-wrap' : 'whitespace-pre'
                      }`}
                    >
                      {trace.response || 'No response data available'}
                    </pre>
                  </div>
              </TabsContent>

              <TabsContent value="metadata" className="mt-4 animate-fade-in">
                 <div className="rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-2 w-1/3">Key</th>
                                <th className="px-4 py-2">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {/* Standard Attributes */}
                            <tr className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium text-muted-foreground">trace_id</td>
                                <td className="px-4 py-2 font-mono select-all">
                                    <div className="flex items-center gap-2">
                                        {trace.id}
                                        <Copy className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(trace.id, 'prompt')} />
                                    </div>
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium text-muted-foreground">service_name</td>
                                <td className="px-4 py-2 font-mono">{trace.service}</td>
                            </tr>
                            <tr className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium text-muted-foreground">span_name</td>
                                <td className="px-4 py-2 font-mono">{trace.endpoint}</td>
                            </tr>
                            <tr className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium text-muted-foreground">model</td>
                                <td className="px-4 py-2 font-mono">{trace.model}</td>
                            </tr>

                            {/* Dynamic Metadata */}
                            {Object.entries(trace.metadata || {})
                                .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([key, value]) => (
                                <tr key={key} className="hover:bg-muted/20">
                                    <td className="px-4 py-2 font-medium text-muted-foreground">{key}</td>
                                    <td className="px-4 py-2 font-mono break-all whitespace-pre-wrap">{String(value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
