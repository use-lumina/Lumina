'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  BookOpen,
  Key,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  getTraces,
  getCostTimeline,
  getCostSummary,
  getAlerts,
  type Trace,
  type Alert,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const router = useRouter();
  const [costTimeRange, setCostTimeRange] = useState<'24h' | '7days' | '30days'>('7days');
  const [tracesTimeRange, setTracesTimeRange] = useState('24hours');
  const [tracesFallback, setTracesFallback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentTraces, setRecentTraces] = useState<Trace[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [costFallback, setCostFallback] = useState<string | null>(null);

  // Progress: prefer backend-provided progress if available. Backend may use one of
  // `progress_percent`, `progressPercent`, or `progress` keys in `costSummary.summary`.
  function getOnboardingProgress(): number {
    const backend = costSummary?.summary;
    const backendValue = backend?.progress_percent ?? backend?.progressPercent ?? backend?.progress;

    if (backendValue !== undefined && backendValue !== null) {
      const parsed = Number(backendValue);
      if (!Number.isNaN(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
    }

    // Fallback: compute lightweight progress from available UI items
    const sdkDone = true; // currently assumed
    const viewedTraces = totalRequests > 0;
    const invited = false; // no invite tracking yet
    const itemsDone = [sdkDone, viewedTraces, invited].filter(Boolean).length;
    return Math.round((itemsDone / 3) * 100);
  }

  function humanizeTracesRange(range: string, fallback: string | null) {
    if (fallback === '24hours') return 'Last 24 hours';
    if (range === '15min') return '15 minutes';
    if (range === '1hour') return '1 hour';
    if (range === '24hours') return '24 hours';
    return range;
  }

  // Fetch data on mount and when time ranges change
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Calculate time range for traces
        const now = new Date();
        const tracesDurations: Record<string, number> = {
          '15min': 15 * 60 * 1000,
          '1hour': 60 * 60 * 1000,
          '24hours': 24 * 60 * 60 * 1000,
        };

        const requestedDuration = tracesDurations[tracesTimeRange] ?? 15 * 60 * 1000;
        const tracesStartTime = new Date(now.getTime() - requestedDuration);

        // Fetch recent traces
        const tracesResponse = await getTraces({
          limit: 3,
          startTime: tracesStartTime.toISOString(),
        });

        // If no traces in the requested short window, fall back to 24h automatically
        if (
          (tracesResponse.pagination?.total || 0) === 0 &&
          (tracesTimeRange === '15min' || tracesTimeRange === '1hour')
        ) {
          const fallbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const fallbackResp = await getTraces({
            limit: 3,
            startTime: fallbackStart.toISOString(),
          });
          setRecentTraces(fallbackResp.data);
          setTotalRequests(fallbackResp.pagination.total);
          setTracesFallback('24hours');
        } else {
          setRecentTraces(tracesResponse.data);
          setTotalRequests(tracesResponse.pagination.total);
          setTracesFallback(null);
        }

        // Fetch cost summary for the current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const summaryResponse = await getCostSummary({
          startTime: monthStart.toISOString(),
          endTime: now.toISOString(),
        });
        setCostSummary(summaryResponse);

        // Fetch cost timeline based on selected range
        let granularity: 'hour' | 'day' | 'week' = 'day';
        let startTime = new Date();

        if (costTimeRange === '24h') {
          granularity = 'hour';
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (costTimeRange === '7days') {
          granularity = 'day';
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          granularity = 'day';
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const timelineResponse = await getCostTimeline({
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          granularity,
        });

        console.debug('getCostTimeline response:', timelineResponse);

        // Transform timeline data for the chart with defensive parsing
        const chartData = timelineResponse.data.map((item: any) => {
          const date = new Date(item.time_bucket);
          let timeLabel = '';

          if (costTimeRange === '24h') {
            timeLabel = `${date.getHours()}:00`;
          } else if (costTimeRange === '7days') {
            timeLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
          } else {
            timeLabel = `${date.getDate()}`;
          }

          const requests = item.request_count ? parseInt(String(item.request_count), 10) : 0;
          const avgCost = item.avg_cost ? parseFloat(String(item.avg_cost)) : undefined;
          const totalCost = item.total_cost ? parseFloat(String(item.total_cost)) : 0;
          const cost =
            typeof avgCost === 'number' && !Number.isNaN(avgCost)
              ? avgCost
              : requests > 0
                ? totalCost / requests
                : 0;

          return {
            time: timeLabel,
            cost,
            requests,
          };
        });
        // If no timeline points returned and user selected a shorter range, fall back to last 24h
        if (chartData.length === 0 && costTimeRange !== '24h') {
          const fallbackStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const fallbackResp = await getCostTimeline({
            startTime: fallbackStart.toISOString(),
            endTime: now.toISOString(),
            granularity: 'hour',
          });
          console.debug('getCostTimeline fallback response:', fallbackResp);

          const fallbackChartData = fallbackResp.data.map((item: any) => {
            const date = new Date(item.time_bucket);
            const timeLabel = `${date.getHours()}:00`;
            const requests = item.request_count ? parseInt(String(item.request_count), 10) : 0;
            const avgCost = item.avg_cost ? parseFloat(String(item.avg_cost)) : undefined;
            const totalCost = item.total_cost ? parseFloat(String(item.total_cost)) : 0;
            const cost =
              typeof avgCost === 'number' && !Number.isNaN(avgCost)
                ? avgCost
                : requests > 0
                  ? totalCost / requests
                  : 0;
            return { time: timeLabel, cost, requests };
          });

          setCostData(fallbackChartData);
          setCostFallback('24h');
        } else {
          setCostData(chartData);
          setCostFallback(null);
        }

        // Fetch recent alerts
        const alertsResponse = await getAlerts({
          limit: 2,
          status: 'pending',
        });
        setAlerts(alertsResponse.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [costTimeRange, tracesTimeRange]);

  if (isLoading) {
    return (
      <div className="h-full overflow-auto bg-background">
        <div className="p-6 space-y-6 max-w-400 mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-2"></div>
            <div className="h-4 w-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-6 space-y-6 max-w-400 mx-auto">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">
            Observe and optimize AI in production
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time performance monitoring, cost analysis, and quality insights for your AI
            applications
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Card */}
          <Card className="p-6 border-(--accent) animate-scale-in stagger-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>SDK installed. You're ready to go.</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                {/* Install SDK - Completed */}
                <div className="flex items-start gap-3 opacity-50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Install SDK</p>
                  </div>
                </div>

                {/* View Live Traces - Active */}
                <button
                  onClick={() => router.push('/traces')}
                  className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors cursor-pointer"
                >
                  <PlayCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">View Live Traces</p>
                    <p className="text-xs text-muted-foreground">Start streaming traces</p>
                  </div>
                </button>

                {/* Compare in Replay Studio */}
                <button
                  onClick={() => router.push('/replay')}
                  className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Circle className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Compare in Replay Studio</p>
                    <p className="text-xs text-muted-foreground">Re-run and optimize traces</p>
                  </div>
                </button>

                {/* Invite Teammates */}
                <button className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors cursor-pointer">
                  <Circle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Invite Teammates</p>
                    <p className="text-xs text-muted-foreground">Share Lumina with your team</p>
                  </div>
                </button>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{getOnboardingProgress()}% done</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${getOnboardingProgress()}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-(--border)">
                <Button className="w-full" size="lg">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Read the Docs
                </Button>
                <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center justify-center gap-2">
                    <Key className="h-3.5 w-3.5" />
                    Open API Key
                  </span>
                </button>
              </div>
            </div>
          </Card>

          {/* Live Traces Card - Spans 2 columns */}
          <Card className="lg:col-span-2 p-6 border-(--accent) animate-scale-in stagger-2">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-semibold">Live Traces</h2>
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {totalRequests} requests in the last{' '}
                    {humanizeTracesRange(tracesTimeRange, tracesFallback)}
                    {tracesFallback && (
                      <span className="ml-2 text-xs text-muted-foreground">(fallback)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={tracesTimeRange} onValueChange={setTracesTimeRange}>
                    <SelectTrigger className="w-35 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15min">Last 15 min</SelectItem>
                      <SelectItem value="1hour">Last hour</SelectItem>
                      <SelectItem value="24hours">Last 24h</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Live Traces List */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Live Traces
                </div>
                {recentTraces.length > 0 ? (
                  recentTraces.map((trace) => (
                    <div
                      key={trace.trace_id}
                      className="w-full flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-(--border)"
                    >
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          trace.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{trace.service_name}</span>
                          <span className="text-muted-foreground text-sm font-mono">
                            {trace.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{trace.latency_ms} ms</span>
                          <span>·</span>
                          <span>
                            $
                            {typeof trace.cost_usd === 'number'
                              ? trace.cost_usd.toFixed(3)
                              : '0.000'}
                          </span>
                          <span>·</span>
                          <span>{trace.model}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
                    <div>
                      No traces in the last {humanizeTracesRange(tracesTimeRange, tracesFallback)}.
                    </div>
                    <div>
                      <button
                        onClick={() => setTracesTimeRange('24hours')}
                        className="underline text-sm"
                      >
                        Show last 24 hours
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-(--border)">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold">{totalRequests}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total
                    <br />
                    requests
                  </div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold">
                    {costSummary
                      ? `${(costSummary.summary.avg_latency_ms || 0).toFixed(0)}ms`
                      : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg
                    <br />
                    latency
                  </div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold">
                    {costSummary ? `$${(costSummary.summary.avg_cost || 0).toFixed(3)}` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg cost
                    <br />
                    per request
                  </div>
                </div>
              </div>

              {/* View All Link */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/traces')}
                  className="w-full justify-center group cursor-pointer"
                >
                  View Live Traces
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Cost This Month Card */}
          <Card className="p-6 border-(--accent) animate-scale-in stagger-3">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold mb-1">Cost This Month</h2>
                    {costFallback && (
                      <span className="text-xs text-muted-foreground">
                        (timeline: last 24h fallback)
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Cost Display */}
              <div>
                <div className="text-4xl font-bold mb-2">
                  ${costSummary ? (costSummary.summary.total_cost || 0).toFixed(2) : '0.00'}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>
                    {costSummary
                      ? `${(costSummary.summary.total_requests || 0).toLocaleString()} requests`
                      : 'No data'}
                  </span>
                </div>
              </div>

              {/* Time Range Tabs */}
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setCostTimeRange('24h')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    costTimeRange === '24h'
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setCostTimeRange('7days')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    costTimeRange === '7days'
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  7 days
                </button>
                <button
                  onClick={() => setCostTimeRange('30days')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    costTimeRange === '30days'
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  30 days
                </button>
              </div>

              {/* Chart */}
              <div className="h-56 -mx-2">
                {costData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const value =
                              typeof payload[0].value === 'number' ? payload[0].value : 0;
                            const requests = payload[0].payload.requests || 0;
                            return (
                              <div className="bg-card border border-(--border) rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-semibold">${value.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {payload[0].payload.time}
                                </p>
                                <p className="text-xs text-muted-foreground">{requests} requests</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No cost data available
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Alerts Card */}
          <Card className="p-6 border-(--accent) animate-scale-in stagger-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Alerts</h2>
                  <p className="text-sm text-muted-foreground">{alerts.length} active</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <button
                      key={alert.alert_id}
                      onClick={() => router.push(`/alerts/${alert.alert_id}`)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border border-(--border) hover:bg-muted/50 transition-colors text-left"
                    >
                      <div
                        className={`rounded-full p-1.5 shrink-0 ${
                          alert.severity === 'HIGH'
                            ? 'bg-red-100 dark:bg-red-950'
                            : alert.severity === 'MEDIUM'
                              ? 'bg-amber-100 dark:bg-amber-950'
                              : 'bg-blue-100 dark:bg-blue-950'
                        }`}
                      >
                        {alert.severity === 'HIGH' ? (
                          <DollarSign className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">
                          {alert.alert_type === 'cost_spike'
                            ? 'Cost Spike Detected'
                            : alert.alert_type === 'quality_drop'
                              ? 'Quality Degradation'
                              : 'Cost & Quality Issue'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </p>
                        {alert.model && (
                          <p className="text-xs text-muted-foreground mt-1">Model: {alert.model}</p>
                        )}
                        {alert.service_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Service: {alert.service_name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No active alerts
                  </div>
                )}
              </div>

              {/* View All Link */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/alerts')}
                  className="w-full justify-center group"
                >
                  View Alerts
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
