'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { UITrace } from '@/types/trace';

interface TraceTableProps {
  traces: UITrace[];
  selectedTraceId: string | null;
  onTraceSelect: (trace: UITrace) => void;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (selected: Set<string>) => void;
}

export function TraceTable({
  traces,
  selectedTraceId,
  onTraceSelect,
  selectedRows: externalSelectedRows,
  onSelectedRowsChange,
}: TraceTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Use external state if provided, otherwise use internal state
  const selectedRows = externalSelectedRows ?? internalSelectedRows;
  const setSelectedRows = onSelectedRowsChange ?? setInternalSelectedRows;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      time: date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  };

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Pagination calculations
  const totalPages = Math.ceil(traces.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTraces = traces.slice(startIndex, endIndex);

  // Selection handlers
  const toggleRowSelection = (traceId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(traceId)) {
      newSelected.delete(traceId);
    } else {
      newSelected.add(traceId);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === paginatedTraces.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedTraces.map((t) => t.id)));
    }
  };

  const allRowsSelected =
    paginatedTraces.length > 0 && selectedRows.size === paginatedTraces.length;
  const someRowsSelected = selectedRows.size > 0 && selectedRows.size < paginatedTraces.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10 transition-colors">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400 w-[40px]">
                <Checkbox
                  checked={allRowsSelected}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all"
                  className={cn(someRowsSelected && 'data-[state=checked]:bg-muted-foreground/60')}
                />
              </th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[90px]">
                Timestamp
              </th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[200px]">
                Name
              </th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Input</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Output</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[80px]">
                Status
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[80px]">
                Latency
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[80px]">
                Cost
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[80px]">
                Tokens
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTraces.map((trace) => {
              const { date, time } = formatTimestamp(trace.createdAt);
              const isSelected = trace.id === selectedTraceId;
              const isHovered = trace.id === hoveredRow;
              const isRowSelected = selectedRows.has(trace.id);
              const totalTokens =
                (trace.metadata?.tokensIn || 0) + (trace.metadata?.tokensOut || 0);

              return (
                <tr
                  key={trace.id}
                  onMouseEnter={() => setHoveredRow(trace.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    'border-b border-border/40 transition-colors h-8',
                    isSelected && 'bg-primary/10',
                    !isSelected && isHovered && 'bg-accent/40',
                    isRowSelected && 'bg-accent'
                  )}
                >
                  <td className="py-1.5 px-3">
                    <Checkbox
                      checked={isRowSelected}
                      onCheckedChange={() => toggleRowSelection(trace.id)}
                      aria-label={`Select trace ${trace.id}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td
                    className="py-1.5 px-3 font-mono text-muted-foreground cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    <div className="text-[10px]">{date}</div>
                    <div className="text-[10px]">{time}</div>
                  </td>
                  <td className="py-1.5 px-3 cursor-pointer" onClick={() => onTraceSelect(trace)}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{trace.endpoint}</span>
                      {isHovered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-60 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(trace.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {trace.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td
                    className="py-1.5 px-3 text-muted-foreground/90 max-w-[200px] cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    <div className="truncate">
                      {truncateText(
                        trace.prompt || trace.metadata?.input || trace.hierarchicalSpan?.prompt,
                        60
                      )}
                    </div>
                  </td>
                  <td
                    className="py-1.5 px-3 text-muted-foreground/90 max-w-[200px] cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    <div className="truncate">
                      {truncateText(
                        trace.response ||
                          trace.metadata?.output ||
                          trace.hierarchicalSpan?.response,
                        60
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-3 cursor-pointer" onClick={() => onTraceSelect(trace)}>
                    <Badge
                      variant={
                        trace.status === 'healthy'
                          ? 'default'
                          : trace.status === 'degraded'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="text-[10px] h-5 px-1.5"
                    >
                      {trace.status}
                    </Badge>
                  </td>
                  <td
                    className="py-1.5 px-3 text-right font-mono cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    <span
                      className={cn(
                        trace.latencyMs > 1000
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground/80'
                      )}
                    >
                      {trace.latencyMs}ms
                    </span>
                  </td>
                  <td
                    className="py-1.5 px-3 text-right font-mono text-foreground/80 cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    ${trace.costUsd.toFixed(5)}
                  </td>
                  <td
                    className="py-1.5 px-3 text-right font-mono text-foreground/80 cursor-pointer"
                    onClick={() => onTraceSelect(trace)}
                  >
                    {totalTokens > 0 ? totalTokens.toLocaleString() : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="h-12 border-t border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-border rounded px-2 py-1 bg-background text-foreground"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
