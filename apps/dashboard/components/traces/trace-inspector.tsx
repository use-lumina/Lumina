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
        'h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-all duration-300 shadow-xl',
        isFullWidth ? 'fixed inset-0 z-50 ml-[220px]' : 'w-[65%]'
      )}
    >
      {/* Top Header Section */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10">
        {/* Row 1: Title, ID, Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {currentSpan?.service_name || trace.endpoint || 'Trace Detail'}
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-slate-500 h-5 px-1.5 gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(trace.id)}
                >
                  <span className="opacity-70">ID</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {trace.id}
                  </span>
                  <Copy className="h-3 w-3" />
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 hidden sm:flex bg-white dark:bg-slate-950"
            >
              <Database className="h-3 w-3 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">Add to datasets</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 hidden sm:flex bg-white dark:bg-slate-950"
            >
              <PenLine className="h-3 w-3 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">Annotate</span>
            </Button>
            <Separator orientation="vertical" className="h-4 mx-1.5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-500"
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? 'Exit full width' : 'Expand full width'}
            >
              {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-500"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Date */}
        <div className="px-4 pb-2 text-xs text-slate-500 font-mono">
          {formatDate(trace.createdAt)}
        </div>

        {/* Row 3: Stats Pills */}
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-6"
          >
            Latency: {formatDuration(trace.latencyMs)}
          </Badge>
          <Badge
            variant="secondary"
            className="font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-6"
          >
            Env: {trace.release || 'production'}
          </Badge>
          <Badge
            variant="secondary"
            className="font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-6"
          >
            ${trace.costUsd.toFixed(6)}
          </Badge>
          {totalTokens > 0 && (
            <Badge
              variant="secondary"
              className="font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-6"
            >
              {trace.metadata?.tokensIn || 0} prompt → {trace.metadata?.tokensOut || 0} completion
              (Σ {totalTokens})
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree Sidebar - Always visible */}
        <div className="w-[280px] border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col shrink-0">
          <div className="h-9 flex items-center px-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Timeline
            </span>
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
                          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                          isSelected &&
                            'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                        )}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                      >
                        {hasChildren ? (
                          isExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-500" />
                          )
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className="flex-1 truncate text-left text-slate-700 dark:text-slate-300 decoration-slate-400">
                          {span.service_name || span.endpoint}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 opacity-70">
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
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 bg-white dark:bg-slate-950">
              <TabsList className="bg-transparent p-0 h-10 gap-6 justify-start w-auto">
                <TabsTrigger
                  value="preview"
                  className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 px-1 py-2 text-sm font-semibold bg-transparent shadow-none"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="log"
                  className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 px-1 py-2 text-sm font-medium bg-transparent shadow-none"
                >
                  Log View
                </TabsTrigger>
              </TabsList>

              {/* Global View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-1 border border-slate-200 dark:border-slate-700 h-8">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={cn(
                    'px-3 h-full rounded-sm text-[12px] font-medium transition-all flex items-center justify-center gap-1.5',
                    viewMode === 'formatted'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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

                        {/* Fallback for IO */}
                        {!currentSpan?.prompt && !currentSpan?.response && (
                          <div className="text-slate-500 text-sm italic">
                            No formatted data available.
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Metadata Section (merged) */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                          Metadata
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Trace ID
                            </label>
                            <p className="font-mono text-slate-700 dark:text-slate-300">
                              {trace.id}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Service
                            </label>
                            <p className="text-slate-700 dark:text-slate-300">
                              {currentSpan?.service_name || 'N/A'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Model
                            </label>
                            <p className="text-slate-700 dark:text-slate-300">
                              {currentSpan?.model || 'N/A'}
                            </p>
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
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                              Scores
                            </h4>
                            <div className="grid gap-4">
                              {trace.evaluations.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-sm">{ev.evaluator}</h4>
                                    <Badge variant={ev.score >= 0.8 ? 'default' : 'secondary'}>
                                      {ev.score.toFixed(2)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {ev.reasoning}
                                  </p>
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
                    <div className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex-1">Observation</div>
                        <div className="w-24 text-right">Duration</div>
                      </div>
                      {currentSpan.children.map((child) => (
                        <div
                          key={child.span_id}
                          className="px-4 py-3 flex items-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedSpanId(child.span_id);
                          }}
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {child.span_id.substring(0, 4)}
                            </Badge>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {child.service_name || child.endpoint}
                            </span>
                          </div>
                          <div className="w-24 text-right font-mono text-xs text-slate-500">
                            {formatDuration(child.latency_ms)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-sm">
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
