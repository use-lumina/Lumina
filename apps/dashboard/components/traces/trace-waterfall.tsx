'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HierarchicalSpan } from '@/types/trace';
import { Database, Brain, Terminal } from 'lucide-react';

interface TraceWaterfallProps {
  span: HierarchicalSpan;
  totalDuration: number;
}

export function TraceWaterfall({ span, totalDuration }: TraceWaterfallProps) {
  // Flatten the span tree into a list with depth for rendering
  const flattenedSpans = useMemo(() => {
    const result: Array<{ span: HierarchicalSpan; depth: number }> = [];

    const traverse = (s: HierarchicalSpan, depth: number) => {
      result.push({ span: s, depth });
      if (s.children && s.children.length > 0) {
        s.children.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        s.children.forEach((child) => traverse(child, depth + 1));
      }
    };

    traverse(span, 0);
    return result;
  }, [span]);

  const startTime = new Date(span.timestamp).getTime();

  const getIcon = (type: string) => {
    // Infer type from service/name if not explicit
    const lowerName = type.toLowerCase();
    if (lowerName.includes('postgres') || lowerName.includes('db') || lowerName.includes('redis'))
      return <Database className="h-3 w-3" />;
    if (
      lowerName.includes('llm') ||
      lowerName.includes('openai') ||
      lowerName.includes('anthropic')
    )
      return <Brain className="h-3 w-3" />;
    return <Terminal className="h-3 w-3" />;
  };

  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <div className="grid grid-cols-[2fr_100px_3fr] gap-4 p-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
        <div>Span</div>
        <div className="text-right">Duration</div>
        <div className="pl-4">Timeline</div>
      </div>

      <div className="divide-y divide-border/50">
        {flattenedSpans.map(({ span: s, depth }, index) => {
          const spanStart = new Date(s.timestamp).getTime();
          const offsetMs = spanStart - startTime;
          const offsetPercent = Math.max(0, Math.min(100, (offsetMs / totalDuration) * 100));
          const widthPercent = Math.max(1, Math.min(100, (s.latency_ms / totalDuration) * 100));

          return (
            <div
              key={`${s.span_id}-${index}`}
              className="grid grid-cols-[2fr_100px_3fr] gap-4 p-2 text-sm hover:bg-muted/20 items-center group"
            >
              <div
                className="flex items-center gap-2 overflow-hidden"
                style={{ paddingLeft: `${depth * 16}px` }}
              >
                <div className="p-1 rounded bg-muted text-muted-foreground shrink-0">
                  {getIcon(s.service_name)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate text-xs">{s.endpoint || s.span_id}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {s.service_name} • {s.model || 'internal'}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                {s.latency_ms}ms
              </div>

              <div className="relative h-6 w-full flex items-center pr-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-border/40" />
                </div>
                {/* Timeline Bar */}
                <div
                  className={cn(
                    'h-3 rounded-sm relative group-hover:ring-1 ring-primary/20 transition-all',
                    s.status === 'error' ? 'bg-red-500/40' : 'bg-primary/40'
                  )}
                  style={{
                    left: `${offsetPercent}%`,
                    width: `${widthPercent}%`,
                    position: 'absolute',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
