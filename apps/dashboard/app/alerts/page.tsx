'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, AlertCircle, CheckCircle2, Eye, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAlerts, acknowledgeAlert, type Alert } from '@/lib/api';
import { TableBody } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await getAlerts({
        severity: filterSeverity !== 'all' ? filterSeverity.toUpperCase() : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        limit: 100,
      });
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [filterSeverity, filterStatus]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      // Refresh alerts to get updated status
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (!alert) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity.toUpperCase()) return false;
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    return true;
  });

  // Group alerts by severity
  const _groupedAlerts = {
    HIGH: filteredAlerts.filter((a) => a?.severity === 'HIGH'),
    MEDIUM: filteredAlerts.filter((a) => a?.severity === 'MEDIUM'),
    LOW: filteredAlerts.filter((a) => a?.severity === 'LOW'),
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5" />;
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5" />;
      case 'LOW':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const _getSeverityBadgeVariant = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getTypeBadge = (type: string) => {
    const label =
      type === 'cost_and_quality'
        ? 'Cost + Quality'
        : type === 'cost_spike'
          ? 'Cost'
          : type === 'quality_drop'
            ? 'Quality'
            : type === 'latency'
              ? 'Latency'
              : type;

    return (
      <Badge
        variant="muted"
        className="text-[10px] uppercase font-bold tracking-tighter bg-accent/20 border-border/50"
      >
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const isPending = status === 'pending';
    const isAck = status === 'acknowledged';
    const isResolved = status === 'resolved';

    return (
      <Badge
        variant="muted"
        className="text-[10px] uppercase font-bold tracking-tighter border-border/50"
      >
        <div
          className={cn(
            'w-1 h-1 rounded-full mr-1.5',
            isPending && 'bg-destructive animate-pulse',
            isAck && 'bg-amber-500',
            isResolved && 'bg-emerald-500'
          )}
        />
        {status}
      </Badge>
    );
  };

  const getAlertTitle = (alert: Alert) => {
    switch (alert.alert_type) {
      case 'cost_spike':
        return 'Cost Spike Detected';
      case 'quality_drop':
        return 'Quality Drop Detected';
      case 'cost_and_quality':
        return 'Cost & Quality Issue';
      case 'latency':
        return 'Latency Issue';
      default:
        return alert.alert_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const _AlertCard = ({ alert }: { alert: Alert }) => {
    if (!alert) return null;

    return (
      <Card
        className={cn(
          'p-3 transition-all hover:bg-accent/50 border-border group relative overflow-hidden',
          alert.status === 'pending' && 'ring-1 ring-inset ring-destructive/30'
        )}
      >
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={cn(
                  'rounded p-1.5 shrink-0 transition-colors',
                  alert.severity === 'HIGH' && 'bg-destructive/10 text-destructive',
                  alert.severity === 'MEDIUM' && 'bg-amber-500/10 text-amber-500',
                  alert.severity === 'LOW' && 'bg-primary/10 text-primary'
                )}
              >
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {getAlertTitle(alert)}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {getTypeBadge(alert.alert_type)}
                    {getStatusBadge(alert.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                  {alert.service_name && (
                    <span className="font-semibold text-foreground/80">{alert.service_name}</span>
                  )}
                  {alert.endpoint && (
                    <span className="truncate max-w-[200px]">{alert.endpoint}</span>
                  )}
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'h-5 text-[10px] font-mono uppercase border-border',
                alert.severity === 'HIGH' && 'text-destructive border-destructive/30'
              )}
            >
              {alert.severity}
            </Badge>
          </div>

          {alert.reasoning && (
            <p className="text-xs text-muted-foreground bg-accent/20 p-2 rounded border border-border/50">
              {alert.reasoning}
            </p>
          )}

          {/* Metrics & Actions Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {alert.current_cost !== undefined && alert.current_cost !== null && (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    Cost
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-foreground">
                    ${alert.current_cost.toFixed(4)}
                  </span>
                  {alert.cost_increase_percent !== undefined && (
                    <span className="text-[10px] font-bold text-destructive ml-0.5">
                      +{alert.cost_increase_percent.toFixed(0)}%
                    </span>
                  )}
                </div>
              )}
              {alert.latency_ms !== undefined && alert.latency_ms !== null && (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    Lat
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-foreground">
                    {alert.latency_ms}ms
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {alert.trace_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] uppercase font-bold tracking-tight hover:bg-accent"
                  onClick={() => router.push(`/traces?traceId=${alert.trace_id}`)}
                >
                  <Eye className="h-3 w-3 mr-1.5" />
                  View Trace
                </Button>
              )}
              {alert.status === 'pending' && (
                <Button
                  size="sm"
                  className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold tracking-tight"
                  onClick={() => handleAcknowledge(alert.alert_id)}
                >
                  <Check className="h-3 w-3 mr-1.5" />
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const activeCount = alerts.filter((a) => a?.status === 'pending').length;
  const highSeverityCount = alerts.filter(
    (a) => a?.severity === 'HIGH' && a?.status === 'pending'
  ).length;

  if (isLoading && alerts.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Alerts</h1>
            <p className="text-muted-foreground">Monitor and manage system alerts</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage system alerts across your services
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Alerts
                </p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                >
                  Requires attention
                </Badge>
              </div>
              <div className="rounded-md bg-destructive/10 p-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  High Severity
                </p>
                <p className="text-2xl font-bold text-foreground">{highSeverityCount}</p>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30"
                >
                  Critical issues
                </Badge>
              </div>
              <div className="rounded-md bg-amber-500/10 p-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Resolved (24h)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {alerts.filter((a) => a?.status === 'resolved').length}
                </p>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  Recently resolved
                </Badge>
              </div>
              <div className="rounded-md bg-emerald-500/10 p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>

        {/* Alerts Table */}
        <Card className="p-0 border-border bg-card shadow-sm overflow-hidden">
          <div className="relative w-full overflow-x-auto">
            {filteredAlerts.length > 0 ? (
              <table className="w-full caption-bottom text-[11px]">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10 transition-colors">
                  <tr>
                    <th className="w-[40px] px-3"></th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Severity
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Alert Type
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Service / Endpoint
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      Metrics
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      When
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-center">
                      Status
                    </th>
                    <th className="w-[80px] h-9 px-3"></th>
                  </tr>
                </thead>
                <TableBody>
                  {filteredAlerts.map((alert: Alert) => (
                    <tr
                      key={alert.alert_id}
                      className={cn(
                        'cursor-pointer hover:bg-accent/40 transition-colors border-b border-border/50 h-9 group',
                        alert.status === 'pending' && 'bg-destructive/5'
                      )}
                      onClick={() => alert.trace_id && router.push(`/traces?id=${alert.trace_id}`)}
                    >
                      <td className="px-3 py-1.5">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(var(--primary),0.2)]',
                            alert.severity === 'HIGH'
                              ? 'bg-red-500 shadow-red-500/20'
                              : alert.severity === 'MEDIUM'
                                ? 'bg-amber-500 shadow-amber-500/20'
                                : 'bg-primary shadow-primary/20'
                          )}
                        ></div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-1 text-[9px] font-bold uppercase',
                            alert.severity === 'HIGH'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : alert.severity === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {getAlertTitle(alert)}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[150px]">
                            {alert.service_name || 'System'}
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground truncate max-w-[200px]">
                            {alert.endpoint || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          {alert.current_cost !== undefined && alert.current_cost !== null && (
                            <span className="font-mono font-bold text-foreground">
                              ${alert.current_cost.toFixed(4)}
                              {alert.cost_increase_percent !== undefined &&
                                alert.cost_increase_percent !== null && (
                                  <span className="text-destructive ml-1">
                                    +{alert.cost_increase_percent.toFixed(0)}%
                                  </span>
                                )}
                            </span>
                          )}
                          {alert.latency_ms !== undefined && alert.latency_ms !== null && (
                            <span className="font-mono text-muted-foreground tracking-tighter">
                              {alert.latency_ms}ms
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-3 py-1.5 text-right text-muted-foreground tabular-nums tracking-tighter"
                        suppressHydrationWarning
                      >
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: false })}
                      </td>
                      <td className="px-3 py-1.5 text-center">{getStatusBadge(alert.status)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-end gap-1 px-1">
                          {alert.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-emerald-500/10 hover:text-emerald-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledge(alert.alert_id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (alert.trace_id) router.push(`/traces/detail/${alert.trace_id}`);
                            }}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </table>
            ) : (
              <div className="text-center py-20 bg-accent/10">
                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-sm font-semibold text-foreground">All Systems Clear</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  No alerts found for the current filters
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
