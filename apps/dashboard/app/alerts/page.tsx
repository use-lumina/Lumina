'use client';

import { useState } from 'react';
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
  TrendingUp,
  Eye,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertSeverity = 'high' | 'medium' | 'low';
type AlertType = 'cost_quality' | 'cost' | 'quality' | 'latency';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  endpoint: string;
  triggeredAt: string;
  status: AlertStatus;
  metrics: {
    current: number;
    threshold: number;
    unit: string;
  };
  relatedTraces: number;
}

// Mock alerts data
const mockAlerts: Alert[] = [
  {
    id: 'alert_001',
    severity: 'high',
    type: 'cost_quality',
    title: 'High Cost & Quality Degradation Detected',
    description: 'Cost spike of 245% with 15% increase in error rate',
    endpoint: '/chat/completions',
    triggeredAt: '2024-12-18T10:30:00Z',
    status: 'active',
    metrics: { current: 1245.67, threshold: 500, unit: '$' },
    relatedTraces: 234,
  },
  {
    id: 'alert_002',
    severity: 'high',
    type: 'cost_quality',
    title: 'Critical: Response Quality Drop',
    description: 'Token generation quality score below 60% threshold',
    endpoint: '/chat/stream',
    triggeredAt: '2024-12-18T09:15:00Z',
    status: 'active',
    metrics: { current: 55, threshold: 60, unit: '%' },
    relatedTraces: 156,
  },
  {
    id: 'alert_003',
    severity: 'medium',
    type: 'cost',
    title: 'Cost Threshold Exceeded',
    description: 'Daily cost limit reached for gpt-4 model',
    endpoint: '/completions',
    triggeredAt: '2024-12-18T08:45:00Z',
    status: 'active',
    metrics: { current: 534.21, threshold: 400, unit: '$' },
    relatedTraces: 89,
  },
  {
    id: 'alert_004',
    severity: 'medium',
    type: 'cost',
    title: 'Unusual Spending Pattern',
    description: '150% increase in API costs compared to weekly average',
    endpoint: '/embeddings',
    triggeredAt: '2024-12-18T07:30:00Z',
    status: 'acknowledged',
    metrics: { current: 892.34, threshold: 600, unit: '$' },
    relatedTraces: 445,
  },
  {
    id: 'alert_005',
    severity: 'high',
    type: 'cost_quality',
    title: 'High Latency & Cost Spike',
    description: 'Response time increased 200% with cost spike',
    endpoint: '/analyze',
    triggeredAt: '2024-12-18T06:00:00Z',
    status: 'acknowledged',
    metrics: { current: 2340, threshold: 1000, unit: 'ms' },
    relatedTraces: 67,
  },
  {
    id: 'alert_006',
    severity: 'medium',
    type: 'cost',
    title: 'Budget Alert: 80% Consumed',
    description: 'Monthly budget for Claude models at 80% utilization',
    endpoint: '/chat/message',
    triggeredAt: '2024-12-17T23:00:00Z',
    status: 'resolved',
    metrics: { current: 4567.89, threshold: 5000, unit: '$' },
    relatedTraces: 1234,
  },
  {
    id: 'alert_007',
    severity: 'low',
    type: 'latency',
    title: 'Elevated Response Times',
    description: 'Average latency increased by 30%',
    endpoint: '/summarize',
    triggeredAt: '2024-12-17T20:15:00Z',
    status: 'resolved',
    metrics: { current: 650, threshold: 500, unit: 'ms' },
    relatedTraces: 45,
  },
];

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, status: 'acknowledged' as AlertStatus } : alert
      )
    );
  };

  const handleViewTraces = (alert: Alert) => {
    // Navigate to traces filtered by this alert's endpoint
    router.push(`/traces?endpoint=${encodeURIComponent(alert.endpoint)}`);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    return true;
  });

  // Group alerts by severity
  const groupedAlerts = {
    high: filteredAlerts.filter((a) => a.severity === 'high'),
    medium: filteredAlerts.filter((a) => a.severity === 'medium'),
    low: filteredAlerts.filter((a) => a.severity === 'low'),
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5" />;
      case 'low':
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityBadgeVariant = (severity: AlertSeverity) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
    }
  };

  const getTypeBadge = (type: AlertType) => {
    switch (type) {
      case 'cost_quality':
        return (
          <Badge variant="destructive" className="text-xs">
            Cost + Quality
          </Badge>
        );
      case 'cost':
        return (
          <Badge variant="warning" className="text-xs">
            Cost
          </Badge>
        );
      case 'quality':
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
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            Active
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
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)} days ago`;
    } else if (hours > 0) {
      return `${hours} hours ago`;
    } else {
      return `${minutes} minutes ago`;
    }
  };

  const AlertCard = ({ alert }: { alert: Alert }) => (
    <Card
      className={cn(
        'p-4 transition-all hover:shadow-md',
        alert.severity === 'high' && 'border-red-500/50',
        alert.severity === 'medium' && 'border-amber-500/50'
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                'rounded-lg p-2',
                alert.severity === 'high' &&
                  'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
                alert.severity === 'medium' &&
                  'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
                alert.severity === 'low' &&
                  'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
              )}
            >
              {getSeverityIcon(alert.severity)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{alert.title}</h3>
                {getTypeBadge(alert.type)}
                {getStatusBadge(alert.status)}
              </div>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono">{alert.endpoint}</span>
                <span>•</span>
                <span>{formatTimestamp(alert.triggeredAt)}</span>
                <span>•</span>
                <span>{alert.relatedTraces} related traces</span>
              </div>
            </div>
          </div>
          <Badge variant={getSeverityBadgeVariant(alert.severity)} className="uppercase text-xs">
            {alert.severity}
          </Badge>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 px-2 py-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            {alert.type.includes('cost') ? (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              Current: {alert.metrics.current}
              {alert.metrics.unit}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Threshold: {alert.metrics.threshold}
            {alert.metrics.unit}
          </div>
          <div
            className={cn(
              'text-sm font-semibold',
              alert.metrics.current > alert.metrics.threshold
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            )}
          >
            {alert.metrics.current > alert.metrics.threshold ? '+' : ''}
            {((alert.metrics.current / alert.metrics.threshold - 1) * 100).toFixed(0)}%
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleViewTraces(alert)}>
            <Eye className="h-4 w-4 mr-2" />
            View Traces ({alert.relatedTraces})
          </Button>
          {alert.status === 'active' && (
            <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
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

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const highSeverityCount = alerts.filter(
    (a) => a.severity === 'high' && a.status === 'active'
  ).length;

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
                  {alerts.filter((a) => a.status === 'resolved').length}
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>

        {/* Alerts Grouped by Severity */}
        {groupedAlerts.high.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">High Severity</h2>
              <Badge variant="destructive">{groupedAlerts.high.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.high.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {groupedAlerts.medium.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Medium Severity</h2>
              <Badge variant="warning">{groupedAlerts.medium.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.medium.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {groupedAlerts.low.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Low Severity</h2>
              <Badge variant="secondary">{groupedAlerts.low.length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedAlerts.low.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
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
