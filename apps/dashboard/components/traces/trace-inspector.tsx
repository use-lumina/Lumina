'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Copy,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Database,
  PenLine,
  AlignLeft,
  Braces,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UITrace, HierarchicalSpan } from '@/types/trace';
import { JsonViewer } from './json-viewer';
import { DataViewer } from './data-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TraceInspectorProps {
  trace: UITrace | null;
  onClose: () => void;
}

// Flatten hierarchical span tree for sidebar navigation
function flattenSpanTree(
  span: HierarchicalSpan,
  depth: number = 0
): Array<{ span: HierarchicalSpan; depth: number; id: string }> {
  const result: Array<{ span: HierarchicalSpan; depth: number; id: string }> = [];

  result.push({
    span,
    depth,
    id: span.span_id,
  });

  if (span.children && span.children.length > 0) {
    span.children.forEach((child) => {
      result.push(...flattenSpanTree(child, depth + 1));
    });
  }

  return result;
}

export function TraceInspector({ trace, onClose }: TraceInspectorProps) {
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  const [isCopied, setIsCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleCopyId = () => {
    if (!trace) return;
    navigator.clipboard.writeText(trace.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!trace) return null;

  const totalTokens = (trace.metadata?.tokensIn || 0) + (trace.metadata?.tokensOut || 0);
  const spanTree = trace.hierarchicalSpan ? flattenSpanTree(trace.hierarchicalSpan) : [];

  // Select root span by default
  const currentSpan = selectedSpanId
    ? spanTree.find((s) => s.id === selectedSpanId)?.span
    : trace.hierarchicalSpan;

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hour12: false,
      })
      .replace(',', '');
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={cn(
        'h-full border-l border-border bg-card flex flex-col transition-all duration-300 shadow-2xl',
        isFullWidth ? 'fixed inset-0 z-50 ml-[220px]' : 'w-[65%]'
      )}
    >
      {/* Top Header Section */}
      <div className="shrink-0 border-b border-border bg-card z-10">
        {/* Row 1: Title, ID, Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">
                  {currentSpan?.service_name || trace.endpoint || 'Trace Detail'}
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground h-5 px-1.5 gap-1.5 hover:bg-accent transition-colors cursor-pointer"
                  onClick={handleCopyId}
                >
                  <span className="opacity-70">ID</span>
                  <span className="font-semibold text-foreground">{trace.id}</span>
                  {isCopied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 hidden sm:flex bg-card"
            >
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Add to datasets</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 hidden sm:flex bg-card"
            >
              <PenLine className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Annotate</span>
            </Button>
            <Separator orientation="vertical" className="h-4 mx-1.5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? 'Exit full width' : 'Expand full width'}
            >
              {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Date */}
        <div className="px-4 pb-2 text-xs text-muted-foreground/60 font-mono">
          {formatDate(trace.createdAt)}
        </div>

        {/* Row 3: Stats Pills */}
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="font-normal bg-muted text-muted-foreground hover:bg-accent transition-colors h-6"
          >
            Latency: {formatDuration(trace.latencyMs)}
          </Badge>
          <Badge
            variant="secondary"
            className="font-normal bg-muted text-muted-foreground hover:bg-accent transition-colors h-6"
          >
            Env: {trace.release || 'production'}
          </Badge>
          <Badge
            variant="secondary"
            className="font-normal bg-muted text-muted-foreground hover:bg-accent transition-colors h-6"
          >
            ${trace.costUsd.toFixed(6)}
          </Badge>
          {totalTokens > 0 && (
            <Badge
              variant="secondary"
              className="font-normal bg-muted text-muted-foreground hover:bg-accent transition-colors h-6"
            >
              {trace.metadata?.tokensIn || 0} prompt → {trace.metadata?.tokensOut || 0} completion
              (Σ {totalTokens})
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree Sidebar */}
        <div
          className={cn(
            'border-r border-border bg-muted/30 flex flex-col shrink-0 transition-all duration-300 overflow-hidden',
            isSidebarOpen ? 'w-[280px]' : 'w-0 border-r-0'
          )}
        >
          <div className="h-9 flex items-center justify-between px-3 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent rounded-sm"
              onClick={() => setIsSidebarOpen(false)}
            >
              <Minimize2 className="h-3 w-3 rotate-90" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {spanTree.length > 0 ? (
                spanTree.map(({ span, depth, id }) => {
                  const hasChildren = span.children && span.children.length > 0;
                  const isExpanded = expandedSpans.has(id);
                  const isSelected = selectedSpanId === id || (!selectedSpanId && depth === 0);

                  return (
                    <div key={id}>
                      <button
                        onClick={() => {
                          setSelectedSpanId(id);
                          if (hasChildren) toggleSpan(id);
                        }}
                        className={cn(
                          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors',
                          isSelected &&
                            'bg-accent text-foreground font-medium shadow-sm ring-1 ring-border'
                        )}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                      >
                        {hasChildren ? (
                          isExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          )
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className="flex-1 truncate text-left text-foreground/90">
                          {span.service_name || span.endpoint}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 opacity-70">
                          {formatDuration(span.latency_ms)}
                        </span>
                      </button>
                      {!isExpanded && hasChildren && <div className="h-px w-full" />}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-xs text-slate-500 text-center">No timeline data</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border px-4 flex items-center justify-between shrink-0 bg-card">
              <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-accent"
                    onClick={() => setIsSidebarOpen(true)}
                    title="Open Sidebar"
                  >
                    <Maximize2 className="h-4 w-4 rotate-90" />
                  </Button>
                )}
                <TabsList className="bg-transparent p-0 h-10 gap-6 justify-start w-auto">
                  <TabsTrigger
                    value="preview"
                    className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground px-1 py-2 text-sm font-semibold bg-transparent shadow-none"
                  >
                    Preview
                  </TabsTrigger>
                  <TabsTrigger
                    value="log"
                    className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground px-1 py-2 text-sm font-medium bg-transparent shadow-none"
                  >
                    Log View
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Global View Toggle */}
              <div className="flex items-center bg-muted rounded-md p-1 border border-border h-8">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={cn(
                    'px-3 h-full rounded-sm text-[12px] font-medium transition-all flex items-center justify-center gap-1.5',
                    viewMode === 'formatted'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <AlignLeft className="h-3 w-3" />
                  Formatted
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={cn(
                    'px-3 h-full rounded-sm text-[12px] font-medium transition-all flex items-center justify-center gap-1.5',
                    viewMode === 'json'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Braces className="h-3 w-3" />
                  JSON
                </button>
              </div>
            </div>

            <TabsContent value="preview" className="flex-1 p-0 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-8 max-w-5xl mx-auto">
                  {viewMode === 'json' ? (
                    /* Raw JSON View for the entire span */
                    <JsonViewer data={currentSpan || trace} />
                  ) : (
                    /* Formatted View: IO + Metadata */
                    <>
                      {/* Input / Output Section */}
                      <div className="space-y-6">
                        {currentSpan?.prompt && (
                          <div className="space-y-3">
                            <DataViewer
                              data={currentSpan.prompt}
                              label="Input"
                              viewMode="formatted"
                            />
                          </div>
                        )}

                        {currentSpan?.response && (
                          <div className="space-y-3">
                            {currentSpan.prompt && <Separator className="my-6" />}
                            <DataViewer
                              data={currentSpan.response}
                              label="Output"
                              viewMode="formatted"
                            />
                          </div>
                        )}

                        {/* Fallback for IO removed per user request */}
                      </div>

                      <Separator />

                      {/* Metadata Section (merged) */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                          Metadata
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                              Trace ID
                            </label>
                            <p className="font-mono text-foreground/80">{trace.id}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                              Service
                            </label>
                            <p className="text-foreground/80">
                              {currentSpan?.service_name || 'N/A'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                              Model
                            </label>
                            <p className="text-foreground/80">{currentSpan?.model || 'N/A'}</p>
                          </div>
                          {/* Custom attributes */}
                          {/* JSON Fallback removed per user request */}
                        </div>
                      </div>

                      {/* Scores Section (merged) */}
                      {trace.evaluations && trace.evaluations.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                              Scores
                            </h4>
                            <div className="grid gap-4">
                              {trace.evaluations.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="border border-border rounded-lg p-4 bg-card"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-sm">{ev.evaluator}</h4>
                                    <Badge variant={ev.score >= 0.8 ? 'default' : 'secondary'}>
                                      {ev.score.toFixed(2)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{ev.reasoning}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="log" className="flex-1 p-0 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-0">
                  {/* Log View - Show children as a list/table */}
                  {currentSpan?.children && currentSpan.children.length > 0 ? (
                    <div className="min-w-full divide-y divide-border">
                      <div className="bg-muted/50 px-4 py-2 flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <div className="flex-1">Observation</div>
                        <div className="w-24 text-right">Duration</div>
                      </div>
                      {currentSpan.children.map((child) => (
                        <div
                          key={child.span_id}
                          className="px-4 py-3 flex items-center hover:bg-accent/40 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedSpanId(child.span_id);
                          }}
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {child.span_id.substring(0, 4)}
                            </Badge>
                            <span className="text-sm font-medium text-foreground/90">
                              {child.service_name || child.endpoint}
                            </span>
                          </div>
                          <div className="w-24 text-right font-mono text-xs text-muted-foreground">
                            {formatDuration(child.latency_ms)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground/50 text-sm">
                      No child observations found for this span.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
