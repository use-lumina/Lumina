'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { HierarchicalSpan } from '@/types/trace';
import { Badge } from '@/components/ui/badge';
import { normalizeTraceStatus } from '@/lib/trace-status';

interface SpanTreeProps {
  span: HierarchicalSpan;
  level?: number;
  selectedSpanId?: string;
  onSpanSelect?: (span: HierarchicalSpan) => void;
}

export function SpanTree({ span, level = 0, selectedSpanId, onSpanSelect }: SpanTreeProps) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = span.children && span.children.length > 0;
  const indent = level * 20;
  const isSelected = selectedSpanId === span.span_id;
  const normalizedStatus = normalizeTraceStatus(span.status);

  const handleSpanClick = () => {
    onSpanSelect?.(span);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/10 border border-primary/30'
            : 'hover:bg-muted/50 border border-transparent'
        }`}
        style={{ marginLeft: `${indent}px` }}
        onClick={handleSpanClick}
      >
        {hasChildren ? (
          <button
            className="flex items-center justify-center w-5 h-5 shrink-0 hover:bg-muted rounded"
            onClick={handleExpandClick}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
              {span.service_name}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {span.span_id}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{span.latency_ms}ms</span>
            {span.cost_usd !== undefined && <span>${span.cost_usd.toFixed(4)}</span>}
            {span.model && <span className="font-mono">{span.model}</span>}
          </div>
        </div>

        <div className="shrink-0">
          <Badge
            variant={normalizedStatus === 'success' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {normalizedStatus}
          </Badge>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="space-y-1">
          {span.children.map((child) => (
            <SpanTree
              key={child.span_id}
              span={child}
              level={level + 1}
              selectedSpanId={selectedSpanId}
              onSpanSelect={onSpanSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
