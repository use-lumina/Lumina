'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  PlayCircle,
  Clock,
  DollarSign,
  Hash,
  Activity,
  GitCompare,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { ReplaySet, ReplaySummary } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ReplayDetailProps {
  replaySet: ReplaySet;
  summary: ReplaySummary | null;
}

export function ReplayDetail({ replaySet, summary }: ReplayDetailProps) {
  const router = useRouter();

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'warning';
      case 'failed':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const completedPercentage =
    replaySet.total_traces > 0
      ? ((replaySet.completed_traces || 0) / replaySet.total_traces) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{replaySet.name}</h1>
            <Badge variant={getStatusVariant(replaySet.status)} className="flex items-center gap-1">
              {getStatusIcon(replaySet.status)}
              {replaySet.status}
            </Badge>
          </div>
          {replaySet.status === 'completed' && summary && (
            <Button onClick={() => router.push(`/replay/${replaySet.replay_id}/diff`)}>
              <GitCompare className="h-4 w-4 mr-2" />
              View Detailed Diff
            </Button>
          )}
        </div>
        {replaySet.description && (
          <p className="text-muted-foreground mb-2">{replaySet.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-mono text-xs">
            {replaySet.replay_id}
          </Badge>
          <span>•</span>
          <span>Created {new Date(replaySet.created_at).toLocaleString()}</span>
          {replaySet.created_by && (
            <>
              <span>•</span>
              <span>by {replaySet.created_by}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Execution Progress
          </h3>
          <span className="text-sm font-medium text-muted-foreground">
            {replaySet.completed_traces || 0} / {replaySet.total_traces} traces
          </span>
        </div>
        <div className="space-y-2">
          <Progress value={completedPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground text-right">{completedPercentage.toFixed(0)}% complete</p>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && replaySet.status === 'completed' && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Hash className="h-4 w-4" />
                <span>Hash Similarity</span>
              </div>
              <p className="text-2xl font-semibold">
                {((summary.avg_hash_similarity || 0) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span>Semantic Score</span>
              </div>
              <p className="text-2xl font-semibold">
                {((summary.avg_semantic_score || 0) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Avg Cost Diff</span>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  (summary.avg_cost_diff || 0) > 0
                    ? 'text-red-500'
                    : (summary.avg_cost_diff || 0) < 0
                      ? 'text-green-500'
                      : ''
                }`}
              >
                {(summary.avg_cost_diff || 0) > 0 ? '+' : ''}$
                {(summary.avg_cost_diff || 0).toFixed(4)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span>Avg Latency Diff</span>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  (summary.avg_latency_diff || 0) > 0
                    ? 'text-red-500'
                    : (summary.avg_latency_diff || 0) < 0
                      ? 'text-green-500'
                      : ''
                }`}
              >
                {(summary.avg_latency_diff || 0) > 0 ? '+' : ''}
                {Math.round(summary.avg_latency_diff || 0)}ms
              </p>
            </div>
          </div>

          {/* Response Changes */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Response Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Total Results</span>
                <span className="text-2xl font-semibold">{summary.total_results || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Responses Changed</span>
                <span className="text-2xl font-semibold">{summary.response_changes || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Consistency Rate</span>
                <span className="text-2xl font-semibold">
                  {summary.total_results > 0
                    ? (
                        ((summary.total_results - (summary.response_changes || 0)) /
                          summary.total_results) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Cost & Latency Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Impact
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Average cost difference per request
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      (summary.avg_cost_diff || 0) > 0
                        ? 'text-red-500'
                        : (summary.avg_cost_diff || 0) < 0
                          ? 'text-green-500'
                          : ''
                    }`}
                  >
                    {(summary.avg_cost_diff || 0) > 0 ? '+' : ''}$
                    {(summary.avg_cost_diff || 0).toFixed(4)}
                  </span>
                  <span className="text-sm text-muted-foreground">per request</span>
                </div>
                {summary.avg_cost_diff !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {(summary.avg_cost_diff || 0) > 0
                      ? 'Replay costs are higher on average'
                      : 'Replay costs are lower on average'}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Performance Impact
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Average latency difference per request
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      (summary.avg_latency_diff || 0) > 0
                        ? 'text-red-500'
                        : (summary.avg_latency_diff || 0) < 0
                          ? 'text-green-500'
                          : ''
                    }`}
                  >
                    {(summary.avg_latency_diff || 0) > 0 ? '+' : ''}
                    {Math.round(summary.avg_latency_diff || 0)}ms
                  </span>
                  <span className="text-sm text-muted-foreground">per request</span>
                </div>
                {summary.avg_latency_diff !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {(summary.avg_latency_diff || 0) > 0
                      ? 'Replay requests are slower on average'
                      : 'Replay requests are faster on average'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending/Running State */}
      {(replaySet.status === 'pending' || replaySet.status === 'running') && (
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {replaySet.status === 'pending' ? 'Replay Pending' : 'Replay In Progress'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {replaySet.status === 'pending'
                ? 'This replay has not been executed yet.'
                : 'The replay is currently executing. Results will appear here once complete.'}
            </p>
          </div>
        </div>
      )}

      {/* Failed State */}
      {replaySet.status === 'failed' && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Replay Failed</h3>
            <p className="text-sm text-muted-foreground">
              An error occurred while executing this replay. Please try again or contact support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
