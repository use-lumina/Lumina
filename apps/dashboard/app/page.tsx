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
  TrendingDown,
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
  getTraceTrends,
  type Trace,
  type Alert,
  type TraceTrendsResponse,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [trends, setTrends] = useState<TraceTrendsResponse | null>(null);

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

        // Fetch trace trends using the same time range as traces
        // Use fallback duration if no traces were found in the requested window
        const trendDuration =
          tracesFallback === '24hours' ? 24 * 60 * 60 * 1000 : requestedDuration;
        const trendStart = new Date(now.getTime() - trendDuration);
        const trendsResponse = await getTraceTrends({
          startTime: trendStart.toISOString(),
          endTime: now.toISOString(),
        });
        setTrends(trendsResponse);
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
        <div className="animate-fade-in flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Observe and optimize AI in production
          </h1>
          <p className="text-sm text-muted-foreground">
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
                <h2 className="text-lg font-semibold text-foreground mb-2">Quick Actions</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>SDK installed. You're ready to go.</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                {/* Install SDK - Completed */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-xs text-foreground">Install SDK</p>
                  </div>
                </div>

                {/* View Live Traces - Active */}
                <button
                  onClick={() => router.push('/traces')}
                  className="w-full flex items-start gap-3 text-left hover:bg-accent/50 p-2 -ml-2 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PlayCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                      View Live Traces
                    </p>
                    <p className="text-[10px] text-muted-foreground">Start streaming traces</p>
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
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${getOnboardingProgress()}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-border">
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
          <Card className="lg:col-span-2 p-6 border-border animate-scale-in stagger-2">
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

              {/* Live Traces Table */}
              <div className="relative w-full overflow-x-auto rounded border border-border/50">
                {recentTraces.length > 0 ? (
                  <table className="w-full caption-bottom text-[11px]">
                    <thead>
                      <tr className="hover:bg-transparent border-b border-border h-8">
                        <th className="w-4 px-2"></th>
                        <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                          Service
                        </th>
                        <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                          Endpoint
                        </th>
                        <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                          Latency
                        </th>
                        <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                          Cost
                        </th>
                        <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                          When
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTraces.map((trace) => (
                        <tr key={trace.trace_id} className="border-b border-border/50 h-8">
                          <td className="px-2 py-1.5">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                trace.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            ></div>
                          </td>
                          <td className="px-2 py-1.5 font-semibold text-foreground truncate max-w-[120px]">
                            {trace.service_name}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {trace.endpoint}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-muted-foreground/80">
                            {trace.latency_ms}ms
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-foreground">
                            ${(trace.cost_usd || 0).toFixed(4)}
                          </td>
                          <td
                            className="px-2 py-1.5 text-right text-muted-foreground tabular-nums"
                            suppressHydrationWarning
                          >
                            {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: false })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground/60 text-[11px] space-y-3">
                    <div>
                      No traces in the last {humanizeTracesRange(tracesTimeRange, tracesFallback)}.
                    </div>
                    <div>
                      <button
                        onClick={() => setTracesTimeRange('24hours')}
                        className="underline text-[10px] font-bold uppercase tracking-tight hover:text-foreground"
                      >
                        Show last 24 hours
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Stats with Trends */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
                {/* Total Requests */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-foreground">
                      {trends?.current.totalRequests ?? totalRequests}
                    </span>
                    {trends?.trends.requestsTrend !== 0 &&
                      trends?.trends.requestsTrend !== undefined && (
                        <div
                          className={cn(
                            'flex items-center gap-0.5 text-[10px] font-medium',
                            trends.trends.requestsTrend > 0
                              ? 'text-emerald-600 dark:text-emerald-500'
                              : 'text-red-600 dark:text-red-500'
                          )}
                        >
                          {trends.trends.requestsTrend > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(trends.trends.requestsTrend).toFixed(0)}%
                        </div>
                      )}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Requests
                  </div>
                </div>

                {/* Avg Latency */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-foreground">
                      {trends?.current.avgLatency
                        ? `${trends.current.avgLatency.toFixed(0)}ms`
                        : '-'}
                    </span>
                    {trends?.trends.latencyTrend !== 0 &&
                      trends?.trends.latencyTrend !== undefined && (
                        <div
                          className={cn(
                            'flex items-center gap-0.5 text-[10px] font-medium',
                            trends.trends.latencyTrend < 0
                              ? 'text-emerald-600 dark:text-emerald-500'
                              : 'text-red-600 dark:text-red-500'
                          )}
                        >
                          {trends.trends.latencyTrend > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(trends.trends.latencyTrend).toFixed(0)}%
                        </div>
                      )}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Avg Latency
                  </div>
                </div>

                {/* Avg Cost */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-foreground">
                      {trends?.current.totalCost !== null && trends?.current.totalCost !== undefined
                        ? `$${trends.current.totalCost.toFixed(4)}`
                        : '-'}
                    </span>
                    {trends?.trends.costTrend !== 0 && trends?.trends.costTrend !== undefined && (
                      <div
                        className={cn(
                          'flex items-center gap-0.5 text-[10px] font-medium',
                          trends.trends.costTrend < 0
                            ? 'text-emerald-600 dark:text-emerald-500'
                            : 'text-red-600 dark:text-red-500'
                        )}
                      >
                        {trends.trends.costTrend > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(trends.trends.costTrend).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Avg Cost
                  </div>
                </div>

                {/* Error Rate */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-foreground">
                      {trends?.current.errorRate !== undefined
                        ? `${trends.current.errorRate.toFixed(1)}%`
                        : '-'}
                    </span>
                    {trends?.trends.errorRateTrend !== 0 &&
                      trends?.trends.errorRateTrend !== undefined && (
                        <div
                          className={cn(
                            'flex items-center gap-0.5 text-[10px] font-medium',
                            trends.trends.errorRateTrend < 0
                              ? 'text-emerald-600 dark:text-emerald-500'
                              : 'text-red-600 dark:text-red-500'
                          )}
                        >
                          {trends.trends.errorRateTrend > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(trends.trends.errorRateTrend).toFixed(0)}%
                        </div>
                      )}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Error Rate
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
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
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
                              <div className="bg-card border border-border rounded-md px-2.5 py-1.5 shadow-xl ring-1 ring-border/50">
                                <p className="text-xs font-semibold text-foreground">
                                  ${value.toFixed(4)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                                    {payload[0].payload.time}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/30">•</span>
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                                    {requests} requests
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }}
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
          <Card className="p-6 border-border animate-scale-in stagger-4">
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
                      key={alert.alertId}
                      onClick={() => router.push(`/traces?id=${alert.traceId}`)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div
                        className={cn(
                          'rounded-full p-2 shrink-0 shadow-sm',
                          alert.severity === 'HIGH'
                            ? 'bg-destructive/10 text-destructive'
                            : alert.severity === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-primary/10 text-primary'
                        )}
                      >
                        {alert.severity === 'HIGH' ? (
                          <DollarSign className="h-3.5 w-3.5" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">
                          {alert.alertType === 'cost_spike'
                            ? 'Cost Spike Detected'
                            : alert.alertType === 'quality_drop'
                              ? 'Quality Degradation'
                              : 'Cost & Quality Issue'}
                        </p>
                        <p className="text-xs text-muted-foreground/60 font-mono tracking-tighter">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </p>
                        {alert.model && (
                          <p className="text-xs text-muted-foreground mt-1">Model: {alert.model}</p>
                        )}
                        {alert.serviceName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Service: {alert.serviceName}
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
