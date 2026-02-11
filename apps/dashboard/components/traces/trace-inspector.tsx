'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Copy, ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UITrace, HierarchicalSpan } from '@/types/trace';
import { JsonViewer } from './json-viewer';

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
    id: span.trace_id,
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
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={cn(
        'h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-all duration-300',
        isFullWidth ? 'fixed inset-0 z-50 ml-[220px]' : 'w-[65%]'
      )}
    >
      {/* Header */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            Trace: {trace.endpoint}
          </h3>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
            {trace.id.substring(0, 8)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setIsFullWidth(!isFullWidth)}
            title={isFullWidth ? 'Exit full width' : 'Expand full width'}
          >
            {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400">Latency:</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
            {formatDuration(trace.latencyMs)}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400">Env:</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {trace.release || 'production'}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400">Cost:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            ${trace.costUsd.toFixed(5)}
          </span>
        </div>
        {totalTokens > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Tokens:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {trace.metadata?.tokensIn || 0} → {trace.metadata?.tokensOut || 0} (Σ {totalTokens})
            </span>
          </div>
        )}
      </div>

      {/* Main Content: Tree Sidebar + Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree Sidebar - Always visible */}
        <div className="w-[280px] border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex flex-col shrink-0">
          <div className="h-10 flex items-center px-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Trace Timeline
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
                          isSelected && 'bg-slate-100 dark:bg-slate-800'
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
                        <span className="flex-1 truncate text-left text-slate-700 dark:text-slate-300">
                          {span.service_name || span.endpoint}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {formatDuration(span.latency_ms)}
                        </span>
                      </button>
                      {!isExpanded && hasChildren && (
                        <div className="h-px" /> // Collapsed children indicator
                      )}
                    </div>
                  );
                })
              ) : (
                // Fallback: Show at least the root trace
                <div className="p-2">
                  <button className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs bg-slate-100 dark:bg-slate-800">
                    <span className="w-3" />
                    <span className="flex-1 truncate text-left text-slate-700 dark:text-slate-300">
                      {trace.endpoint}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {formatDuration(trace.latencyMs)}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 max-w-5xl">
            {/* User Section */}
            {currentSpan?.prompt && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">User</h4>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentSpan.prompt}
                </div>
              </div>
            )}

            {/* Scores Section */}
            {trace.evaluations && trace.evaluations.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Score
                  </h4>
                  {trace.evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {evaluation.evaluator}:
                        </span>
                        <Badge
                          variant={evaluation.score >= 0.8 ? 'default' : 'secondary'}
                          className="text-xs h-5"
                        >
                          {evaluation.score.toFixed(1)}
                        </Badge>
                      </div>
                      {evaluation.reasoning && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {evaluation.reasoning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Assistant Response */}
            {currentSpan?.response && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Assistant
                  </h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {currentSpan.response}
                  </div>
                </div>
              </>
            )}

            {/* Metadata Section */}
            <Separator />
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Metadata</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Trace ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                      {trace.id.substring(0, 16)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => navigator.clipboard.writeText(trace.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Timestamp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                    {formatDate(trace.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Service</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {currentSpan?.service_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Model</span>
                  <span className="text-slate-700 dark:text-slate-300">{currentSpan?.model}</span>
                </div>
                {trace.userId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">User ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                      {trace.userId}
                    </span>
                  </div>
                )}
                {trace.sessionId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Session ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                      {trace.sessionId}
                    </span>
                  </div>
                )}
                {currentSpan?.prompt_tokens && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Input Tokens</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {currentSpan.prompt_tokens}
                    </span>
                  </div>
                )}
                {currentSpan?.completion_tokens && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Output Tokens</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {currentSpan.completion_tokens}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Raw JSON (collapsible) */}
            <Separator />
            <details className="group">
              <summary className="text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer list-none flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Raw JSON
              </summary>
              <div className="mt-3">
                <JsonViewer data={currentSpan || trace} />
              </div>
            </details>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
