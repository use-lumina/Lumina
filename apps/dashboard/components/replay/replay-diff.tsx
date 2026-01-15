'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  DollarSign,
  Clock,
  Hash,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from 'lucide-react';
import type { ReplayResult } from '@/lib/api';
import { getReplayDiff } from '@/lib/api';

interface ReplayDiffProps {
  replayId: string;
}

export function ReplayDiff({ replayId }: ReplayDiffProps) {
  const [results, setResults] = useState<ReplayResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    loadResults();
  }, [currentPage, showOnlyChanges, replayId]);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const data = await getReplayDiff(replayId, {
        limit: itemsPerPage,
        offset,
        showOnlyChanges,
      });
      setResults(data.data);
      setTotalItems(data.pagination.total);
    } catch (error) {
      console.error('Failed to load replay diff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleShowOnlyChanges = () => {
    setShowOnlyChanges(!showOnlyChanges);
    setCurrentPage(1);
  };

  const getDiffIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDiffColor = (value: number, isPositiveGood = false) => {
    if (value === 0) return '';
    if (isPositiveGood) {
      return value > 0 ? 'text-green-500' : 'text-red-500';
    }
    return value > 0 ? 'text-red-500' : 'text-green-500';
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading comparison results...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && results.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Results</h3>
          <p className="text-sm text-muted-foreground">
            {showOnlyChanges
              ? 'No response changes found in this replay.'
              : 'No comparison results available.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={showOnlyChanges ? 'default' : 'outline'}
            onClick={toggleShowOnlyChanges}
            size="sm"
          >
            {showOnlyChanges ? 'Showing Changes Only' : 'Show All Results'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {totalItems} result{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="space-y-6">
        {results.map((result) => (
          <div
            key={result.result_id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            {/* Header with Trace Info */}
            <div className="bg-muted px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {result.trace_id}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {result.service_name} • {result.endpoint} • {result.model}
                  </span>
                </div>
                {result.diff_summary?.response_changed && (
                  <Badge variant="warning">Response Changed</Badge>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-border bg-muted/30">
              {/* Cost Diff */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Cost Impact</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiffIcon(result.diff_summary?.cost_diff || 0)}
                  <span
                    className={`text-lg font-semibold ${getDiffColor(result.diff_summary?.cost_diff || 0)}`}
                  >
                    {(result.diff_summary?.cost_diff || 0) > 0 ? '+' : ''}$
                    {(result.diff_summary?.cost_diff || 0).toFixed(4)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.diff_summary?.cost_diff_percent
                    ? `${(result.diff_summary.cost_diff_percent || 0) > 0 ? '+' : ''}${result.diff_summary.cost_diff_percent.toFixed(1)}%`
                    : '0%'}
                </p>
              </div>

              {/* Latency Diff */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Latency Impact</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiffIcon(result.diff_summary?.latency_diff || 0)}
                  <span
                    className={`text-lg font-semibold ${getDiffColor(result.diff_summary?.latency_diff || 0)}`}
                  >
                    {(result.diff_summary?.latency_diff || 0) > 0 ? '+' : ''}
                    {Math.round(result.diff_summary?.latency_diff || 0)}ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.diff_summary?.latency_diff_percent
                    ? `${(result.diff_summary.latency_diff_percent || 0) > 0 ? '+' : ''}${result.diff_summary.latency_diff_percent.toFixed(1)}%`
                    : '0%'}
                </p>
              </div>

              {/* Hash Similarity */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>Hash Similarity</span>
                </div>
                <p className="text-lg font-semibold">
                  {((result.hash_similarity || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Exact match score</p>
              </div>

              {/* Semantic Score */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Semantic Score</span>
                </div>
                <p className="text-lg font-semibold">
                  {((result.semantic_score || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Meaning similarity</p>
              </div>
            </div>

            {/* Prompt */}
            {result.prompt && (
              <div className="p-6 border-b border-border">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Prompt</h4>
                <div className="rounded-lg bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{result.prompt}</pre>
                </div>
              </div>
            )}

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
              {/* Original Response */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Original Response</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />${result.original_cost.toFixed(4)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {result.original_latency}ms
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-4 max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {result.original_response || 'No response data'}
                  </pre>
                </div>
              </div>

              {/* Replay Response */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Replay Response</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />${result.replay_cost.toFixed(4)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {result.replay_latency}ms
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-4 max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {result.replay_response || 'No response data'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-muted/30 text-xs text-muted-foreground">
              Executed at {new Date(result.executed_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <div className="flex justify-center pt-4">
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
