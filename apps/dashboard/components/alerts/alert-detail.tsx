'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  DollarSign,
  Clock,
  Hash,
  TrendingUp,
  CheckCircle,
  Calendar,
  Activity,
} from 'lucide-react';
import type { Alert } from '@/lib/api';
import { acknowledgeAlert, resolveAlert } from '@/lib/api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AlertDetailProps {
  alert: Alert;
}

export function AlertDetail({ alert }: AlertDetailProps) {
  const [status, setStatus] = useState(alert.status);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const router = useRouter();

  const handleAcknowledge = async () => {
    if (status === 'acknowledged' || status === 'resolved') return;

    setIsAcknowledging(true);
    try {
      const result = await acknowledgeAlert(alert.alert_id);
      setStatus(result.alert.status);
      router.refresh();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (status === 'resolved') return;

    setIsResolving(true);
    try {
      const result = await resolveAlert(alert.alert_id);
      setStatus(result.alert.status);
      router.refresh();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityVariant = (
    severity: string
  ): 'destructive' | 'warning' | 'success' | 'secondary' => {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getAlertTypeLabel = (type: string): string => {
    switch (type) {
      case 'cost_spike':
        return 'Cost Spike';
      case 'quality_drop':
        return 'Quality Drop';
      case 'cost_and_quality':
        return 'Cost & Quality';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Alert Details</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {alert.alert_id}
            </Badge>
          </div>
          <div className="flex gap-2">
            {status === 'pending' && (
              <Button onClick={handleAcknowledge} disabled={isAcknowledging}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </Button>
            )}
            {status !== 'resolved' && (
              <Button
                onClick={handleResolve}
                disabled={isResolving}
                variant={status === 'pending' ? 'secondary' : 'default'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isResolving ? 'Resolving...' : 'Resolve'}
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{alert.service_name}</span>
          <span>•</span>
          <span>{alert.endpoint}</span>
        </div>
      </div>

      {/* Status & Type Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Severity</span>
          </div>
          <Badge variant={getSeverityVariant(alert.severity)} className="text-sm">
            {alert.severity}
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <span>Type</span>
          </div>
          <p className="text-sm font-semibold">{getAlertTypeLabel(alert.alert_type)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <CheckCircle className="h-4 w-4" />
            <span>Status</span>
          </div>
          <Badge
            variant={
              status === 'resolved' ? 'success' : status === 'acknowledged' ? 'secondary' : 'warning'
            }
            className="text-sm"
          >
            {status}
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Hash className="h-4 w-4" />
            <span>Model</span>
          </div>
          <p className="text-sm font-semibold">{alert.model}</p>
        </div>
      </div>

      {/* Cost & Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost Metrics */}
        {(alert.alert_type === 'cost_spike' || alert.alert_type === 'cost_and_quality') && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Analysis
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Cost</span>
                <span className="text-lg font-semibold">
                  ${alert.current_cost?.toFixed(4) || '0.0000'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Baseline Cost</span>
                <span className="text-sm">${alert.baseline_cost?.toFixed(4) || '0.0000'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Increase
                </span>
                <span className="text-lg font-bold text-red-500">
                  +{alert.cost_increase_percent?.toFixed(1) || '0.0'}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quality Metrics */}
        {(alert.alert_type === 'quality_drop' || alert.alert_type === 'cost_and_quality') && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quality Scores
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hash Similarity</span>
                <span className="text-lg font-semibold">
                  {((alert.hash_similarity || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Semantic Score</span>
                <span className="text-lg font-semibold">
                  {((alert.semantic_score || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Scoring Method</span>
                <Badge variant="secondary" className="text-xs">
                  {alert.scoring_method || 'N/A'}
                </Badge>
              </div>
              {alert.semantic_cached !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Semantic Cached</span>
                  <Badge variant={alert.semantic_cached ? 'success' : 'secondary'} className="text-xs">
                    {alert.semantic_cached ? 'Yes' : 'No'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h3 className="text-lg font-semibold">Alert Reasoning</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{alert.reasoning}</p>
      </div>

      {/* Trace Performance Metrics */}
      {(alert.cost_usd !== undefined || alert.latency_ms !== undefined) && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {alert.latency_ms !== undefined && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span>Latency</span>
              </div>
              <p className="text-2xl font-semibold">{alert.latency_ms}ms</p>
            </div>
          )}

          {alert.cost_usd !== undefined && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Trace Cost</span>
              </div>
              <p className="text-2xl font-semibold">${alert.cost_usd.toFixed(4)}</p>
            </div>
          )}

          {alert.prompt_tokens !== undefined && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Hash className="h-4 w-4" />
                <span>Prompt Tokens</span>
              </div>
              <p className="text-2xl font-semibold">{alert.prompt_tokens.toLocaleString()}</p>
            </div>
          )}

          {alert.completion_tokens !== undefined && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Hash className="h-4 w-4" />
                <span>Completion Tokens</span>
              </div>
              <p className="text-2xl font-semibold">{alert.completion_tokens.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs for prompt/response/metadata */}
      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-4">
          <div className="rounded-lg border border-border bg-muted p-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {alert.prompt || 'No prompt data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="response" className="mt-4">
          <div className="rounded-lg border border-border bg-muted p-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {alert.response || 'No response data available'}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <dt className="text-sm font-medium text-muted-foreground">Alert ID</dt>
              <dd className="text-sm font-mono">{alert.alert_id}</dd>

              <dt className="text-sm font-medium text-muted-foreground">Trace ID</dt>
              <dd className="text-sm font-mono">
                <a
                  href={`/traces/${alert.trace_id}`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {alert.trace_id}
                </a>
              </dd>

              {alert.span_id && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Span ID</dt>
                  <dd className="text-sm font-mono">{alert.span_id}</dd>
                </>
              )}

              {alert.customer_id && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Customer ID</dt>
                  <dd className="text-sm font-mono">{alert.customer_id}</dd>
                </>
              )}

              <dt className="text-sm font-medium text-muted-foreground">Alert Created</dt>
              <dd className="text-sm font-mono">{new Date(alert.timestamp).toLocaleString()}</dd>

              {alert.trace_timestamp && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Trace Created</dt>
                  <dd className="text-sm font-mono">
                    {new Date(alert.trace_timestamp).toLocaleString()}
                  </dd>
                </>
              )}

              {alert.acknowledged_at && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Acknowledged At</dt>
                  <dd className="text-sm font-mono">
                    {new Date(alert.acknowledged_at).toLocaleString()}
                  </dd>
                </>
              )}

              {alert.resolved_at && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground">Resolved At</dt>
                  <dd className="text-sm font-mono">{new Date(alert.resolved_at).toLocaleString()}</dd>
                </>
              )}
            </dl>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
