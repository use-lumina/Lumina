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
  Activity,
  Database,
} from 'lucide-react';
import type { Alert } from '@/lib/api';
import { acknowledgeAlert, resolveAlert } from '@/lib/api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '../ui/scroll-area';

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
      const result = await acknowledgeAlert(alert.alertId);
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
      const result = await resolveAlert(alert.alertId);
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
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-foreground tracking-tight">Alert Details</h1>
            <Badge
              variant="outline"
              className="font-mono text-[10px] bg-accent text-muted-foreground border-none"
            >
              {alert.alertId}
            </Badge>
          </div>
          <div className="flex gap-1.5">
            {status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2.5 gap-1.5"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </Button>
            )}
            {status !== 'resolved' && (
              <Button
                size="sm"
                variant={status === 'pending' ? 'secondary' : 'default'}
                className="h-7 text-xs px-2.5 gap-1.5"
                onClick={handleResolve}
                disabled={isResolving}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {isResolving ? 'Resolving...' : 'Resolve'}
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">
          <span>{alert.serviceName || 'System'}</span>
          <span>/</span>
          <span className="font-mono text-[9px] lowercase tracking-normal">{alert.endpoint}</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Technical Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                <AlertTriangle className="h-3 w-3" />
                <span>Severity</span>
              </div>
              <Badge
                variant={getSeverityVariant(alert.severity)}
                className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wide"
              >
                {alert.severity}
              </Badge>
            </div>

            <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                <Activity className="h-3 w-3" />
                <span>Type</span>
              </div>
              <p className="text-xs font-semibold text-foreground">
                {getAlertTypeLabel(alert.alertType)}
              </p>
            </div>

            <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                <CheckCircle className="h-3 w-3" />
                <span>Status</span>
              </div>
              <Badge
                variant={
                  status === 'resolved'
                    ? 'success'
                    : status === 'acknowledged'
                      ? 'secondary'
                      : 'warning'
                }
                className="h-5 px-1.5 text-[10px] font-bold uppercase"
              >
                {status}
              </Badge>
            </div>

            <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                <Database className="h-3 w-3" />
                <span>Model</span>
              </div>
              <p className="text-xs font-mono font-bold text-foreground truncate">{alert.model}</p>
            </div>
          </div>

          {/* Metrics & Reasoning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(alert.alertType === 'cost_spike' || alert.alertType === 'cost_and_quality') && (
              <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Cost Impact
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      Current
                    </p>
                    <p className="text-lg font-mono font-bold text-foreground">
                      ${alert.currentCost?.toFixed(4) || '0.0000'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      Baseline
                    </p>
                    <p className="text-sm font-mono text-muted-foreground">
                      ${alert.baselineCost?.toFixed(4) || '0.0000'}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1 uppercase tracking-tight">
                        <TrendingUp className="h-3 w-3" />
                        Increase
                      </span>
                      <span className="text-xl font-mono font-bold text-destructive">
                        +{alert.costIncreasePercent?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(alert.alertType === 'quality_drop' || alert.alertType === 'cost_and_quality') && (
              <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Quality Shift
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      Similarity
                    </p>
                    <p className="text-lg font-mono font-bold text-foreground">
                      {((alert.hashSimilarity || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      Semantic
                    </p>
                    <p className="text-lg font-mono font-bold text-foreground">
                      {((alert.semanticScore || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        Scoring
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 text-[9px] font-bold border-none bg-accent"
                      >
                        {alert.scoringMethod || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reasoning */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Alert Reasoning
            </h3>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              {alert.reasoning}
            </p>
          </div>

          {/* Trace Performance Metrics */}
          {(alert.cost_usd !== undefined || alert.latencyMs !== undefined) && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {alert.latencyMs !== undefined && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    <span>Latency</span>
                  </div>
                  <p className="text-2xl font-semibold">{alert.latencyMs}ms</p>
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
                  <p className="text-2xl font-semibold">
                    {alert.completion_tokens.toLocaleString()}
                  </p>
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

            <TabsContent value="metadata" className="mt-4 outline-none">
              <div className="rounded border border-border bg-card/50 p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                      Alert ID
                    </dt>
                    <dd className="text-xs font-mono text-foreground font-medium">
                      {alert.alertId}
                    </dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                      Trace ID
                    </dt>
                    <dd className="text-xs font-mono">
                      <a
                        href={`/traces/detail/${alert.traceId}`}
                        className="text-primary hover:underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {alert.traceId}
                      </a>
                    </dd>
                  </div>

                  {alert.spanId && (
                    <div className="space-y-1">
                      <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        Span ID
                      </dt>
                      <dd className="text-xs font-mono text-foreground font-medium">
                        {alert.spanId}
                      </dd>
                    </div>
                  )}

                  {alert.customerId && (
                    <div className="space-y-1">
                      <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        Customer ID
                      </dt>
                      <dd className="text-xs font-mono text-foreground font-medium">
                        {alert.customerId}
                      </dd>
                    </div>
                  )}

                  <div className="space-y-1">
                    <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                      Alert Created
                    </dt>
                    <dd className="text-xs font-mono text-foreground font-medium">
                      {new Date(alert.timestamp).toLocaleString()}
                    </dd>
                  </div>

                  {alert.trace_timestamp && (
                    <div className="space-y-1">
                      <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        Trace Created
                      </dt>
                      <dd className="text-xs font-mono text-foreground font-medium">
                        {new Date(alert.trace_timestamp).toLocaleString()}
                      </dd>
                    </div>
                  )}

                  {alert.acknowledged_at && (
                    <div className="space-y-1">
                      <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        Acknowledged At
                      </dt>
                      <dd className="text-xs font-mono text-foreground font-medium">
                        {new Date(alert.acknowledged_at).toLocaleString()}
                      </dd>
                    </div>
                  )}

                  {alert.resolved_at && (
                    <div className="space-y-1">
                      <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        Resolved At
                      </dt>
                      <dd className="text-xs font-mono text-foreground font-medium">
                        {new Date(alert.resolved_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
