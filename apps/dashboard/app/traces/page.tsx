'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import {
  TableSkeleton,
  KPICardSkeleton,
  ChartCardSkeleton,
} from '@/components/ui/loading-skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { TraceDetailDrawer } from '@/components/traces/trace-detail-drawer';
import { TablePagination } from '@/components/ui/table-pagination';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  AlertTriangle,
  Clock,
  X,
  Inbox,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getTraces,
  getCostTimeline,
  getTraceTrends,
  type Trace as APITrace,
  type TraceTrendsResponse,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import type { UITrace } from '@/types/trace';

// API Trace type for this page (keeping snake_case from API)
export type Trace = APITrace;

// Map API trace to UI trace
function mapApiTraceToUI(trace: Trace): UITrace {
  return {
    id: trace.trace_id,
    service: trace.service_name,
    endpoint: trace.endpoint,
    model: trace.model,
    status:
      trace.status === 'ok' || trace.status === 'healthy'
        ? 'healthy'
        : (trace.status as 'healthy' | 'degraded' | 'error'),
    latencyMs: trace.latency_ms,
    costUsd: trace.cost_usd,
    createdAt: trace.timestamp,
    prompt: trace.prompt,
    response: trace.response,
    spans: (trace.metadata as any)?.spans,
    metadata: {
      tokensIn: trace.prompt_tokens,
      tokensOut: trace.completion_tokens,
      temperature: trace.metadata?.temperature,
      userId: trace.metadata?.userId || trace.customer_id,
      sessionId: trace.metadata?.sessionId,
      ...trace.metadata,
    },
  };
}

function formatLatency(ms: number) {
  return `${ms} ms`;
}

function formatCost(usd: number) {
  return `$${usd.toFixed(3)}`;
}

function getRowVariant(status: Trace['status']) {
  switch (status) {
    case 'degraded':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return undefined;
  }
}

export default function Home() {
  // State management
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Data state
  const [traces, setTraces] = useState<Trace[]>([]);
  const [latencyChartData, setLatencyChartData] = useState<any[]>([]);
  const [costChartData, setCostChartData] = useState<any[]>([]);
  const [trends, setTrends] = useState<TraceTrendsResponse['trends'] | null>(null);

  // Filter state
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [endpointFilter, setEndpointFilter] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('24h');

  // Drawer state
  const [selectedTrace, setSelectedTrace] = useState<UITrace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTraces, setTotalTraces] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Fetch traces data
  const fetchTracesData = async () => {
    try {
      const now = new Date();
      let startTime = new Date(now.getTime() - 60 * 60 * 1000); // Default 1 hour

      // Calculate time range
      const ranges: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };

      if (ranges[timeRange]) {
        startTime = new Date(now.getTime() - ranges[timeRange]);
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // Fetch traces with filters and pagination
      const tracesResponse = await getTraces({
        service: serviceFilter !== 'all' ? serviceFilter : undefined,
        model: modelFilter !== 'all' ? modelFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        endpoint: endpointFilter || undefined,
        startTime: timeRange !== 'all' ? startTime.toISOString() : undefined,
        limit: ITEMS_PER_PAGE,
        offset: offset,
      });

      // Debug: log traces response
      console.debug('getTraces response:', tracesResponse);
      setTraces(tracesResponse.data);
      setTotalTraces(tracesResponse.pagination.total);

      // Fetch chart data
      // Determine granularity to request from backend
      const granularity = timeRange === '7d' ? 'day' : 'hour';

      const timelineResponse = await getCostTimeline({
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        granularity,
      });

      // Transform data for charts - now includes latency from API
      // Debug: log timeline response
      console.debug('getCostTimeline response:', timelineResponse);

      const chartData = timelineResponse.data.map((item: any) => {
        const date = new Date(item.time_bucket);

        // Choose label format depending on range
        const timeLabel =
          timeRange === '7d'
            ? `${date.getMonth() + 1}/${date.getDate()}`
            : `${date.getHours().toString().padStart(2, '0')}:${date
                .getMinutes()
                .toString()
                .padStart(2, '0')}`;

        // Backend returns numeric fields sometimes as strings (e.g. request_count)
        const requests = item.request_count ? parseInt(String(item.request_count), 10) : 0;

        // Prefer avg_cost if provided by backend, otherwise derive from total_cost/request_count
        const avgCost = item.avg_cost
          ? parseFloat(String(item.avg_cost))
          : item.total_cost && requests > 0
            ? parseFloat(String(item.total_cost)) / requests
            : 0;

        const avgLatency = item.avg_latency_ms ? parseFloat(String(item.avg_latency_ms)) : 0;

        return {
          time: timeLabel,
          cost: avgCost,
          latency: Math.round(avgLatency),
          requests,
        };
      });

      const latencyData = chartData.map((d) => ({ time: d.time, latency: d.latency }));
      const costData = chartData.map((d) => ({ time: d.time, cost: d.cost }));

      // Debug: log derived chart data
      console.debug('derived chartData length:', chartData.length, {
        latencyDataSample: latencyData.slice(0, 5),
        costDataSample: costData.slice(0, 5),
      });

      setLatencyChartData(latencyData);
      setCostChartData(costData);

      // Fetch trends data
      const trendsResponse = await getTraceTrends({
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        service: serviceFilter !== 'all' ? serviceFilter : undefined,
        model: modelFilter !== 'all' ? modelFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        endpoint: endpointFilter || undefined,
      });

      console.debug('getTraceTrends response:', trendsResponse);
      setTrends(trendsResponse.trends);
    } catch (error) {
      console.error('Failed to fetch traces data:', error);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    async function loadData() {
      setIsInitialLoading(true);
      await fetchTracesData();
      setIsInitialLoading(false);
    }

    loadData();
  }, [serviceFilter, modelFilter, statusFilter, endpointFilter, timeRange, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceFilter, modelFilter, statusFilter, endpointFilter, timeRange]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (isInitialLoading) return;

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await fetchTracesData();
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [
    isInitialLoading,
    serviceFilter,
    modelFilter,
    statusFilter,
    endpointFilter,
    timeRange,
    currentPage,
  ]);

  // Handle edge case: if current page becomes invalid, go to last valid page
  useEffect(() => {
    const totalPages = Math.ceil(totalTraces / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalTraces, currentPage, ITEMS_PER_PAGE]);

  // Handle deep linking - auto-open drawer if traceId is in URL
  useEffect(() => {
    if (isInitialLoading) return;

    const traceId = searchParams.get('traceId');
    if (traceId) {
      const trace = traces.find((t) => t.trace_id === traceId);
      if (trace) {
        setSelectedTrace(mapApiTraceToUI(trace));
        setDrawerOpen(true);
      }
    }
  }, [isInitialLoading, searchParams, traces]);

  // Calculate metrics from traces (all filters are server-side now)
  const displayedTracesCount = traces.length;
  const avgLatency =
    traces.length > 0
      ? Math.round(traces.reduce((sum, t) => sum + t.latency_ms, 0) / traces.length)
      : 0;
  const totalCost = traces.reduce((sum, t) => sum + t.cost_usd, 0);
  const errorCount = traces.filter((t) => t.status === 'error').length;
  const errorRate =
    displayedTracesCount > 0 ? ((errorCount / displayedTracesCount) * 100).toFixed(1) : '0.0';

  // Cost per request (average)
  const avgCostPerRequest = displayedTracesCount > 0 ? totalCost / displayedTracesCount : 0;

  // Get unique values for filters
  const services = Array.from(new Set(traces.map((t) => t.service_name)));
  const models = Array.from(new Set(traces.map((t) => t.model)));

  // Handle trace click
  const handleTraceClick = (trace: Trace) => {
    setSelectedTrace(mapApiTraceToUI(trace));
    setDrawerOpen(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setServiceFilter('all');
    setModelFilter('all');
    setStatusFilter('all');
    setEndpointFilter('');
    setTimeRange('all');
  };

  const hasActiveFilters =
    serviceFilter !== 'all' ||
    modelFilter !== 'all' ||
    statusFilter !== 'all' ||
    endpointFilter.length > 0 ||
    timeRange !== 'all';

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Live Traces</h1>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring of AI model requests and responses
            </p>
          </div>
        </div>

        {/* KPI Cards Loading */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        {/* Charts Loading */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>

        {/* Table Loading */}
        <Card className="p-6 border-(--border)">
          <TableSkeleton rows={10} columns={7} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header with actions */}
      <div className="flex items-start justify-between animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Live Traces</h1>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of AI model requests and responses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeIndicator lastUpdated={lastRefresh} isLive={!isRefreshing} />
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <Card className="p-4 border-(--accent) animate-scale-in stagger-1">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-semibold">{displayedTracesCount.toLocaleString()}</p>
              {trends && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trends.requestsTrend > 0
                      ? 'text-green-600 dark:text-green-500'
                      : trends.requestsTrend < 0
                        ? 'text-red-600 dark:text-red-500'
                        : 'text-muted-foreground'
                  )}
                >
                  {trends.requestsTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trends.requestsTrend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>
                    {trends.requestsTrend > 0 ? '+' : ''}
                    {trends.requestsTrend.toFixed(1)}% vs prev period
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-950">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Avg Latency */}
        <Card className="p-4 border-(--accent) animate-scale-in stagger-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-semibold">{avgLatency}ms</p>
              {trends && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trends.latencyTrend > 0
                      ? 'text-red-600 dark:text-red-500'
                      : trends.latencyTrend < 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-muted-foreground'
                  )}
                >
                  {trends.latencyTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trends.latencyTrend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>
                    {trends.latencyTrend > 0 ? '+' : ''}
                    {trends.latencyTrend.toFixed(1)}% vs prev period
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Total Cost */}
        <Card className="p-4 border-(--accent) animate-scale-in stagger-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-semibold">${totalCost.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">
                Cost / Request: <span className="font-medium">${avgCostPerRequest.toFixed(4)}</span>
              </p>
              {trends && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trends.costTrend > 0
                      ? 'text-red-600 dark:text-red-500'
                      : trends.costTrend < 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-muted-foreground'
                  )}
                >
                  {trends.costTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trends.costTrend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>
                    {trends.costTrend > 0 ? '+' : ''}
                    {trends.costTrend.toFixed(1)}% vs prev period
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        {/* Error Rate */}
        <Card className="p-4 border-(--accent) animate-scale-in stagger-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Error Rate</p>
              <p className="text-2xl font-semibold">{errorRate}%</p>
              {trends && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trends.errorRateTrend > 0
                      ? 'text-red-600 dark:text-red-500'
                      : trends.errorRateTrend < 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-muted-foreground'
                  )}
                >
                  {trends.errorRateTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trends.errorRateTrend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>
                    {trends.errorRateTrend > 0 ? '+' : ''}
                    {trends.errorRateTrend.toFixed(1)}% vs prev period
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Latency Chart */}
        <Card className="p-6 border-(--accent)">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Average Latency</h3>
              <p className="text-xs text-muted-foreground">Last 60 minutes</p>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-semibold">{payload[0].value} ms</p>
                            <p className="text-xs text-muted-foreground">
                              {payload[0].payload.time}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Cost Chart */}
        <Card className="p-6 border-(--accent)">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Cost per Request</h3>
              <p className="text-xs text-muted-foreground">Last 60 minutes</p>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value.toFixed(3)}`}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-semibold">${payload[0].value.toFixed(3)}</p>
                            <p className="text-xs text-muted-foreground">
                              {payload[0].payload.time}
                            </p>
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
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="p-6 border-(--border)">
        <div className="border-b border-border border-(--border) p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="soft" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              {hasActiveFilters && (
                <>
                  {serviceFilter !== 'all' && (
                    <Badge variant="secondary">
                      Service: {serviceFilter}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setServiceFilter('all')}
                      />
                    </Badge>
                  )}
                  {modelFilter !== 'all' && (
                    <Badge variant="secondary">
                      Model: {modelFilter}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setModelFilter('all')}
                      />
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary">
                      Status: {statusFilter}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setStatusFilter('all')}
                      />
                    </Badge>
                  )}
                  {endpointFilter && (
                    <Badge variant="secondary">
                      Endpoint: "{endpointFilter}"
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setEndpointFilter('')}
                      />
                    </Badge>
                  )}
                  {timeRange !== 'all' && (
                    <Badge variant="secondary">
                      Time:{' '}
                      {
                        {
                          '5m': 'Last 5 min',
                          '1h': 'Last hour',
                          '24h': 'Last 24h',
                          '7d': 'Last 7 days',
                        }[timeRange]
                      }
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setTimeRange('all')}
                      />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{totalTraces} total traces</div>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Filter by endpoint..."
                  value={endpointFilter}
                  onChange={(e) => setEndpointFilter(e.target.value)}
                  className="w-full"
                />

                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="degraded">Degraded</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="5m">Last 5 minutes</SelectItem>
                    <SelectItem value="1h">Last hour</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto rounded-lg border border-(--border)">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {traces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Inbox}
                      title="No traces found"
                      description={
                        hasActiveFilters
                          ? 'No traces match your current filters. Try adjusting or clearing your filters.'
                          : 'No trace data available. Traces will appear here once your AI requests are logged.'
                      }
                      action={
                        hasActiveFilters
                          ? {
                              label: 'Clear Filters',
                              onClick: clearFilters,
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                traces.map((trace) => (
                  <TableRow
                    key={trace.trace_id}
                    data-variant={getRowVariant(trace.status)}
                    className="cursor-pointer hover:bg-muted/50 border-(--border)"
                    onClick={() => handleTraceClick(trace)}
                  >
                    <TableCell>
                      <StatusDot status={trace.status} />
                    </TableCell>
                    <TableCell className="font-medium">{trace.service_name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {trace.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md px-2 py-0.5">
                        {trace.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCost(trace.cost_usd)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums',
                        trace.latency_ms > 3000 && 'text-red-600 dark:text-red-400',
                        trace.latency_ms > 1500 &&
                          trace.latency_ms <= 3000 &&
                          'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {formatLatency(trace.latency_ms)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>

          {/* Pagination */}
          {totalTraces > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-(--border) bg-background">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalTraces)} of {totalTraces} traces
              </div>
              <TablePagination
                currentPage={currentPage}
                totalItems={totalTraces}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Trace Detail Drawer */}
      <TraceDetailDrawer trace={selectedTrace} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
