'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { HierarchicalSpan } from '@/types/trace';
import { Badge } from '@/components/ui/badge';

interface SpanTreeProps {
  span: HierarchicalSpan;
  level?: number;
}

export function SpanTree({ span, level = 0 }: SpanTreeProps) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = span.children && span.children.length > 0;
  const indent = level * 20;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
        style={{ marginLeft: `${indent}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button className="flex items-center justify-center w-5 h-5 flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{span.service_name}</span>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {span.span_id}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{span.latency_ms}ms</span>
            {span.cost_usd !== undefined && <span>${span.cost_usd.toFixed(4)}</span>}
            {span.model && <span className="font-mono">{span.model}</span>}
          </div>
        </div>

        <div className="flex-shrink-0">
          <Badge
            variant={span.status === 'success' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {span.status}
          </Badge>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="space-y-1">
          {span.children.map((child) => (
            <SpanTree key={child.span_id} span={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
