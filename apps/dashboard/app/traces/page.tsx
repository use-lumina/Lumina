'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';

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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import { TableSkeleton, ChartCardSkeleton } from '@/components/ui/loading-skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { TraceDetailDrawer } from '@/components/traces/trace-detail-drawer';
import { TablePagination } from '@/components/ui/table-pagination';
import { cn } from '@/lib/utils';
import { Download, X, Inbox } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getTraces, getTraceById, getCostTimeline, type Trace as APITrace } from '@/lib/api';
import type { UITrace, TraceSpan } from '@/types/trace';

// API Trace type for this page (keeping snake_case from API)
export type Trace = APITrace;

// Map API trace to UI trace
function mapApiTraceToUI(trace: Trace): UITrace {
  // Flatten the hierarchical trace structure into a flat array of spans
  const flattenSpans = (span: Trace): TraceSpan[] => {
    const spans: TraceSpan[] = [
      {
        name: span.service_name,
        startMs: 0, // We'll calculate relative timing based on timestamp
        durationMs: span.latency_ms,
        type: 'processing',
      },
    ];

    // Add children spans
    if (span.children && span.children.length > 0) {
      span.children.forEach((child) => {
        spans.push(...flattenSpans(child));
      });
    }

    return spans;
  };

  const spans = flattenSpans(trace);

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
    costUsd: trace.cost_usd || 0,
    createdAt: trace.timestamp,
    prompt: trace.prompt,
    response: trace.response,
    spans,
    hierarchicalSpan: trace,
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

function TracesContent() {
  // State management
  const searchParams = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Data state
  const [traces, setTraces] = useState<Trace[]>([]);
  const [latencyChartData, setLatencyChartData] = useState<any[]>([]);
  const [requestChartData, setRequestChartData] = useState<any[]>([]);

  // Filter state
  // Filter state
  const [serviceFilter, setServiceFilter] = useState<string>(searchParams.get('service') || 'all');
  const [modelFilter, setModelFilter] = useState<string>(searchParams.get('model') || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [endpointFilter, setEndpointFilter] = useState<string>(searchParams.get('endpoint') || '');
  const [timeRange, setTimeRange] = useState<string>(searchParams.get('timeRange') || '24h');

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
      let startTime: Date | undefined;

      // Calculate time range
      const ranges: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };

      if (timeRange !== 'all' && ranges[timeRange]) {
        startTime = new Date(now.getTime() - ranges[timeRange]);
      } else if (timeRange !== 'all') {
        // Default to 1 hour if strict match failed but not 'all' (defensive)
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // Fetch traces with filters and pagination
      const tracesResponse = await getTraces({
        service: serviceFilter !== 'all' ? serviceFilter : undefined,
        model: modelFilter !== 'all' ? modelFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        endpoint: endpointFilter || undefined,
        startTime: startTime ? startTime.toISOString() : undefined,
        limit: ITEMS_PER_PAGE,
        offset: offset,
      });

      // Debug: log traces response
      console.debug('getTraces response:', tracesResponse);
      setTraces(tracesResponse.data);
      setTotalTraces(tracesResponse.pagination.total);

      // Fetch chart data
      // Determine granularity to request from backend
      // For 'all' or '7d', use 'day'. For others, use 'hour' (or 'minute' if we had it, but API seems to support hour/day/week)
      const granularity = timeRange === '7d' || timeRange === 'all' ? 'day' : 'hour';

      const timelineResponse = await getCostTimeline({
        startTime: startTime ? startTime.toISOString() : undefined,
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
          timeRange === '7d' || timeRange === 'all'
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
      const requestData = chartData.map((d) => ({ time: d.time, requests: d.requests }));

      // Debug: log derived chart data
      console.debug('derived chartData length:', chartData.length, {
        latencyDataSample: latencyData.slice(0, 5),
        requestDataSample: requestData.slice(0, 5),
      });

      setLatencyChartData(latencyData);
      setRequestChartData(requestData);
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

  // Get unique values for filters
  const services = Array.from(new Set(traces.map((t) => t.service_name)));
  const models = Array.from(new Set(traces.map((t) => t.model)));

  // Handle trace click
  const handleTraceClick = async (trace: Trace) => {
    // Fetch full trace details with prompt and response
    try {
      const fullTrace = await getTraceById(trace.trace_id);
      setSelectedTrace(mapApiTraceToUI(fullTrace.trace));
      setDrawerOpen(true);
    } catch (error) {
      console.error('Failed to fetch trace details:', error);
      // Fallback to list data if fetch fails
      setSelectedTrace(mapApiTraceToUI(trace));
      setDrawerOpen(true);
    }
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

      {/* Filters */}
      <Card className="p-4 border-(--border)">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            placeholder="Filter by endpoint..."
            value={endpointFilter}
            onChange={(e) => setEndpointFilter(e.target.value)}
            className="w-full"
          />

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Latency Chart */}
        <Card className="p-4 border-(--accent)">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Latency</h3>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="var(--foreground)"
                    opacity={0.7}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="var(--foreground)"
                    opacity={0.7}
                    tickFormatter={(value) => `${value}ms`}
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
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Request Rate Chart */}
        <Card className="p-4 border-(--accent)">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Request Rate</h3>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={requestChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="var(--foreground)"
                    opacity={0.7}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    stroke="var(--foreground)"
                    opacity={0.7}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-semibold">{payload[0].value} reqs</p>
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
                    dataKey="requests"
                    stroke="var(--chart-2)"
                    fill="var(--chart-2)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-(--border)">
        <div className="p-4 border-b border-border border-(--border) flex justify-between items-center bg-muted/20">
          <div className="text-sm font-medium">Traces</div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            )}
            <Button variant="secondary" size="sm" className="h-8 text-xs border border-border">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto rounded-lg border border-(--border)">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Time</TableHead>
                <TableHead className="w-[150px]">Service</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead className="w-[80px]">Method</TableHead>
                <TableHead className="w-[100px]">Status Code</TableHead>
                <TableHead className="text-right w-[100px]">Duration</TableHead>
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
                traces.map((trace) => {
                  const dateObj = new Date(trace.timestamp);
                  const dateStr = dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = dateObj.toLocaleTimeString(undefined, {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  // Attempt to guess Method from endpoint if not in data
                  const method = trace.endpoint.startsWith('GET')
                    ? 'GET'
                    : trace.endpoint.startsWith('POST')
                      ? 'POST'
                      : 'POST'; // Default for AI APIs

                  // Clean endpoint name if it has method prefix
                  const operationName = trace.endpoint.replace(/^(GET|POST|PUT|DELETE)\s+/, '');

                  return (
                    <TableRow
                      key={trace.trace_id}
                      className="cursor-pointer hover:bg-muted/40 border-b border-border/50 h-9 transition-colors"
                      onClick={() => handleTraceClick(trace)}
                    >
                      <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {dateStr}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {timeStr}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium text-foreground">
                        {trace.service_name}
                      </TableCell>
                      <TableCell
                        className="py-2 text-xs font-mono text-foreground/90 truncate max-w-[200px]"
                        title={operationName}
                      >
                        {operationName}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="inline-flex items-center rounded-sm bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20">
                          {method}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              trace.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              trace.status === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {trace.status === 'error' ? '500' : '200'} OK
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span
                          className={cn(
                            'text-xs font-mono tabular-nums',
                            trace.latency_ms > 1000
                              ? 'text-amber-600 font-semibold'
                              : 'text-foreground'
                          )}
                        >
                          {trace.latency_ms}ms
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
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

export default function Home() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}
    >
      <TracesContent />
    </Suspense>
  );
}
