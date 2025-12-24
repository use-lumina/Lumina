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
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAlerts, acknowledgeAlert, type Alert } from '@/lib/api';
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
  const groupedAlerts = {
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

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'cost_and_quality':
        return (
          <Badge variant="destructive" className="text-xs">
            Cost + Quality
          </Badge>
        );
      case 'cost_spike':
        return (
          <Badge variant="warning" className="text-xs">
            Cost
          </Badge>
        );
      case 'quality_drop':
        return (
          <Badge variant="warning" className="text-xs">
            Quality
          </Badge>
        );
      case 'latency':
        return (
          <Badge variant="secondary" className="text-xs">
            Latency
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {type}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'acknowledged':
        return (
          <Badge variant="warning" className="text-xs gap-1">
            <Check className="h-3 w-3" />
            Acknowledged
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="success" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            {status}
          </Badge>
        );
    }
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

  const AlertCard = ({ alert }: { alert: Alert }) => {
    if (!alert) return null;

    return (
      <Card
        className={cn(
          'p-4 transition-all hover:shadow-md',
          alert.severity === 'HIGH' && 'border-red-500/50',
          alert.severity === 'MEDIUM' && 'border-amber-500/50'
        )}
      >
        <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                'rounded-lg p-2',
                alert.severity === 'HIGH' &&
                  'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
                alert.severity === 'MEDIUM' &&
                  'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
                alert.severity === 'LOW' &&
                  'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
              )}
            >
              {getSeverityIcon(alert.severity)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{getAlertTitle(alert)}</h3>
                {getTypeBadge(alert.alert_type)}
                {getStatusBadge(alert.status)}
              </div>
              {alert.reasoning && (
                <p className="text-sm text-muted-foreground">{alert.reasoning}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {alert.service_name && <span>{alert.service_name}</span>}
                {alert.service_name && alert.endpoint && <span>•</span>}
                <span className="font-mono">{alert.endpoint}</span>
                <span>•</span>
                <span>
                  {alert.timestamp
                    ? `${formatDistanceToNow(new Date(alert.timestamp))} ago`
                    : 'Unknown time'}
                </span>
              </div>
            </div>
          </div>
          <Badge variant={getSeverityBadgeVariant(alert.severity)} className="uppercase text-xs">
            {alert.severity}
          </Badge>
        </div>

        {/* Metrics */}
        {(alert.current_cost !== undefined || alert.cost_usd !== undefined || alert.latency_ms !== undefined) && (
          <div className="flex items-center gap-4 px-2 py-2 bg-muted/50 rounded-md flex-wrap">
            {alert.current_cost !== undefined && alert.current_cost !== null && alert.baseline_cost !== undefined && alert.baseline_cost !== null && (
              <>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Current: ${alert.current_cost.toFixed(4)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Baseline: ${alert.baseline_cost.toFixed(4)}
                </div>
                {alert.cost_increase_percent !== undefined && alert.cost_increase_percent !== null && (
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                    +{alert.cost_increase_percent.toFixed(0)}%
                  </div>
                )}
              </>
            )}
            {alert.cost_usd !== undefined && alert.cost_usd !== null && alert.current_cost === undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cost: ${alert.cost_usd.toFixed(4)}</span>
              </div>
            )}
            {alert.latency_ms !== undefined && alert.latency_ms !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Latency: {alert.latency_ms}ms</span>
              </div>
            )}
            {alert.model && (
              <div className="text-sm text-muted-foreground">Model: {alert.model}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {alert.trace_id && (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/traces?traceId=${alert.trace_id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Trace
            </Button>
          )}
          {alert.status === 'pending' && (
            <Button size="sm" onClick={() => handleAcknowledge(alert.alert_id)}>
              <Check className="h-4 w-4 mr-2" />
              Acknowledge
            </Button>
          )}
          {alert.status === 'acknowledged' && (
            <Button size="sm" variant="secondary" disabled>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Acknowledged
            </Button>
          )}
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
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Monitor and manage system alerts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Requires attention</p>
              </div>
              <div className="rounded-lg bg-red-100 dark:bg-red-950 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">High Severity</p>
                <p className="text-3xl font-bold">{highSeverityCount}</p>
                <p className="text-sm text-muted-foreground">Critical issues</p>
              </div>
              <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-3">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Resolved (24h)</p>
                <p className="text-3xl font-bold">
                  {alerts.filter((a) => a?.status === 'resolved').length}
                </p>
                <p className="text-sm text-muted-foreground">Recently resolved</p>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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

        {/* Alerts Grouped by Severity */}
        {groupedAlerts.HIGH.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">High Severity</h2>
              <Badge variant="destructive">{groupedAlerts.HIGH.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.HIGH.map((alert: Alert) => (
                <AlertCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {groupedAlerts.MEDIUM.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Medium Severity</h2>
              <Badge variant="warning">{groupedAlerts.MEDIUM.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.MEDIUM.map((alert: Alert) => (
                <AlertCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {groupedAlerts.LOW.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Low Severity</h2>
              <Badge variant="secondary">{groupedAlerts.LOW.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.LOW.map((alert: Alert) => (
                <AlertCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {filteredAlerts.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No alerts found</h3>
              <p className="text-sm text-muted-foreground">All systems are operating normally</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
