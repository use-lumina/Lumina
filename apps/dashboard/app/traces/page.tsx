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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import {
  TableSkeleton,
  KPICardSkeleton,
  ChartCardSkeleton,
} from '@/components/ui/loading-skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { TraceDetailDrawer } from '@/components/traces/trace-detail-drawer';
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
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

export type TraceSpan = {
  name: string;
  startMs: number;
  durationMs: number;
  type: 'retrieval' | 'generation' | 'processing';
};

export type Trace = {
  id: string;
  service: string;
  endpoint: string;
  model: 'gpt-4' | 'claude-3' | 'gpt-3.5';
  latencyMs: number;
  costUsd: number;
  status: 'healthy' | 'degraded' | 'error';
  createdAt: string;
  // Detailed trace information
  prompt?: string;
  response?: string;
  metadata?: {
    userId?: string;
    sessionId?: string;
    tokensIn?: number;
    tokensOut?: number;
    temperature?: number;
  };
  spans?: TraceSpan[];
};

export const mockTraces: Trace[] = [
  {
    id: 'tr_01HX9A2F4K',
    service: 'chat-api',
    endpoint: '/chat/message',
    model: 'gpt-4',
    latencyMs: 2150,
    costUsd: 0.044,
    status: 'degraded',
    createdAt: '2025-03-18T21:04:12Z',
    prompt: 'Explain quantum computing in simple terms',
    response:
      'Quantum computing is a type of computing that uses quantum mechanics principles to process information. Unlike classical computers that use bits (0 or 1), quantum computers use qubits which can be in multiple states simultaneously...',
    metadata: {
      userId: 'user_abc123',
      sessionId: 'sess_xyz789',
      tokensIn: 42,
      tokensOut: 156,
      temperature: 0.7,
    },
    spans: [
      { name: 'Context Retrieval', startMs: 0, durationMs: 320, type: 'retrieval' },
      { name: 'LLM Generation', startMs: 320, durationMs: 1650, type: 'generation' },
      { name: 'Post-processing', startMs: 1970, durationMs: 180, type: 'processing' },
    ],
  },
  {
    id: 'tr_01HX9A2J9P',
    service: 'search-api',
    endpoint: '/search/query',
    model: 'claude-3',
    latencyMs: 820,
    costUsd: 0.012,
    status: 'healthy',
    createdAt: '2025-03-18T21:04:08Z',
    prompt: 'Find documents about machine learning best practices',
    response:
      'Here are the top 5 documents about machine learning best practices:\n1. "ML Engineering Guide" - Covers data preprocessing and model validation\n2. "Production ML Systems"...',
    metadata: {
      userId: 'user_def456',
      sessionId: 'sess_abc111',
      tokensIn: 28,
      tokensOut: 89,
      temperature: 0.3,
    },
    spans: [
      { name: 'Vector Search', startMs: 0, durationMs: 210, type: 'retrieval' },
      { name: 'Reranking', startMs: 210, durationMs: 150, type: 'processing' },
      { name: 'Summary Generation', startMs: 360, durationMs: 460, type: 'generation' },
    ],
  },
  {
    id: 'tr_01HX9A2NQ3',
    service: 'order-api',
    endpoint: '/checkout',
    model: 'gpt-4',
    latencyMs: 3120,
    costUsd: 0.091,
    status: 'error',
    createdAt: '2025-03-18T21:03:59Z',
    prompt: 'Process checkout for order #12345 with items...',
    response: 'Error: Payment validation failed - insufficient funds',
    metadata: {
      userId: 'user_ghi789',
      sessionId: 'sess_def222',
      tokensIn: 187,
      tokensOut: 23,
      temperature: 0.0,
    },
    spans: [
      { name: 'Order Validation', startMs: 0, durationMs: 450, type: 'processing' },
      { name: 'Payment Check', startMs: 450, durationMs: 2100, type: 'processing' },
      { name: 'Error Handling', startMs: 2550, durationMs: 570, type: 'generation' },
    ],
  },
  {
    id: 'tr_01HX9A2R1A',
    service: 'chat-api',
    endpoint: '/chat/message',
    model: 'gpt-3.5',
    latencyMs: 640,
    costUsd: 0.004,
    status: 'healthy',
    createdAt: '2025-03-18T21:03:42Z',
    prompt: 'What is the weather like today?',
    response:
      "I don't have access to real-time weather data. Please check a weather service like weather.com or use your device's weather app for current conditions.",
    metadata: {
      userId: 'user_jkl012',
      sessionId: 'sess_ghi333',
      tokensIn: 18,
      tokensOut: 45,
      temperature: 0.8,
    },
    spans: [
      { name: 'Intent Detection', startMs: 0, durationMs: 120, type: 'processing' },
      { name: 'Response Generation', startMs: 120, durationMs: 480, type: 'generation' },
      { name: 'Formatting', startMs: 600, durationMs: 40, type: 'processing' },
    ],
  },
  {
    id: 'tr_01HX9A2T8C',
    service: 'support-api',
    endpoint: '/summarize',
    model: 'claude-3',
    latencyMs: 1480,
    costUsd: 0.021,
    status: 'degraded',
    createdAt: '2025-03-18T21:03:31Z',
    prompt: 'Summarize the following customer support conversation: [long text...]',
    response:
      'Summary: Customer reported login issues. Support agent verified credentials and reset password. Issue resolved in 15 minutes. Customer satisfaction: High.',
    metadata: {
      userId: 'agent_support_01',
      sessionId: 'sess_jkl444',
      tokensIn: 523,
      tokensOut: 67,
      temperature: 0.5,
    },
    spans: [
      { name: 'Document Loading', startMs: 0, durationMs: 280, type: 'retrieval' },
      { name: 'Summarization', startMs: 280, durationMs: 1050, type: 'generation' },
      { name: 'Quality Check', startMs: 1330, durationMs: 150, type: 'processing' },
    ],
  },
];

// Mock time series data for charts
const latencyData = [
  { time: '14:00', latency: 1200 },
  { time: '14:05', latency: 980 },
  { time: '14:10', latency: 1450 },
  { time: '14:15', latency: 2100 },
  { time: '14:20', latency: 1650 },
  { time: '14:25', latency: 1320 },
  { time: '14:30', latency: 1580 },
  { time: '14:35', latency: 1890 },
  { time: '14:40', latency: 1420 },
  { time: '14:45', latency: 1180 },
  { time: '14:50', latency: 1350 },
  { time: '14:55', latency: 1520 },
];

const costData = [
  { time: '14:00', cost: 0.042 },
  { time: '14:05', cost: 0.038 },
  { time: '14:10', cost: 0.051 },
  { time: '14:15', cost: 0.067 },
  { time: '14:20', cost: 0.055 },
  { time: '14:25', cost: 0.048 },
  { time: '14:30', cost: 0.062 },
  { time: '14:35', cost: 0.071 },
  { time: '14:40', cost: 0.058 },
  { time: '14:45', cost: 0.044 },
  { time: '14:50', cost: 0.052 },
  { time: '14:55', cost: 0.059 },
];

const latencyChartConfig = {
  latency: {
    label: 'Latency (ms)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const costChartConfig = {
  cost: {
    label: 'Cost ($)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Filter state
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minCost, setMinCost] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Drawer state
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (isInitialLoading) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => {
        setLastRefresh(new Date());
        setIsRefreshing(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [isInitialLoading]);

  // Handle deep linking - auto-open drawer if traceId is in URL
  useEffect(() => {
    if (isInitialLoading) return;

    const traceId = searchParams.get('traceId');
    if (traceId) {
      const trace = mockTraces.find((t) => t.id === traceId);
      if (trace) {
        setSelectedTrace(trace);
        setDrawerOpen(true);
      }
    }
  }, [isInitialLoading, searchParams]);

  // Filter traces
  const filteredTraces = mockTraces.filter((trace) => {
    if (serviceFilter !== 'all' && trace.service !== serviceFilter) return false;
    if (modelFilter !== 'all' && trace.model !== modelFilter) return false;
    if (statusFilter !== 'all' && trace.status !== statusFilter) return false;
    if (
      searchQuery &&
      !trace.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !trace.id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Cost range filter
    if (minCost && parseFloat(minCost) > trace.costUsd) return false;
    if (maxCost && parseFloat(maxCost) < trace.costUsd) return false;

    // Time range filter
    if (timeRange !== 'all') {
      const traceTime = new Date(trace.createdAt).getTime();
      const now = Date.now();
      const ranges: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      if (ranges[timeRange] && now - traceTime > ranges[timeRange]) return false;
    }

    return true;
  });

  // Calculate metrics from filtered data
  const totalTraces = filteredTraces.length;
  const avgLatency =
    filteredTraces.length > 0
      ? Math.round(filteredTraces.reduce((sum, t) => sum + t.latencyMs, 0) / filteredTraces.length)
      : 0;
  const totalCost = filteredTraces.reduce((sum, t) => sum + t.costUsd, 0);
  const errorCount = filteredTraces.filter((t) => t.status === 'error').length;
  const errorRate = totalTraces > 0 ? ((errorCount / totalTraces) * 100).toFixed(1) : '0.0';

  // Get unique values for filters
  const services = Array.from(new Set(mockTraces.map((t) => t.service)));
  const models = Array.from(new Set(mockTraces.map((t) => t.model)));

  // Handle trace click
  const handleTraceClick = (trace: Trace) => {
    setSelectedTrace(trace);
    setDrawerOpen(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setServiceFilter('all');
    setModelFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setMinCost('');
    setMaxCost('');
    setTimeRange('all');
  };

  const hasActiveFilters =
    serviceFilter !== 'all' ||
    modelFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.length > 0 ||
    minCost.length > 0 ||
    maxCost.length > 0 ||
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
              <p className="text-2xl font-semibold">{totalTraces.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
                <TrendingUp className="h-3 w-3" />
                <span>12.5% vs last hour</span>
              </div>
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
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                <TrendingUp className="h-3 w-3" />
                <span>8.2% vs last hour</span>
              </div>
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
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
                <TrendingDown className="h-3 w-3" />
                <span>3.1% vs last hour</span>
              </div>
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
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-500">
                <TrendingUp className="h-3 w-3" />
                <span>2.3% vs last hour</span>
              </div>
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
            <ChartContainer config={latencyChartConfig} className="h-50 w-full">
              <AreaChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </Card>

        {/* Cost Chart */}
        <Card className="p-6 border-(--accent)">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Cost per Request</h3>
              <p className="text-xs text-muted-foreground">Last 60 minutes</p>
            </div>
            <ChartContainer config={costChartConfig} className="h-50 w-full">
              <LineChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
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
                  {searchQuery && (
                    <Badge variant="secondary">
                      Search: "{searchQuery}"
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {(minCost || maxCost) && (
                    <Badge variant="secondary">
                      Cost: ${minCost || '0'} - ${maxCost || '∞'}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => {
                          setMinCost('');
                          setMaxCost('');
                        }}
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
            <div className="text-sm text-muted-foreground">
              {filteredTraces.length} of {mockTraces.length} traces
            </div>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Search endpoint or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Cost Range */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min cost"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                    className="w-full"
                    step="0.001"
                    min="0"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max cost"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    className="w-full"
                    step="0.001"
                    min="0"
                  />
                </div>

                {/* Time Range */}
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

        <div className="overflow-x-auto">
          <Table>
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
              {filteredTraces.length === 0 ? (
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
                filteredTraces.map((trace) => (
                  <TableRow
                    key={trace.id}
                    data-variant={getRowVariant(trace.status)}
                    className="cursor-pointer hover:bg-muted/50 border-(--border)"
                    onClick={() => handleTraceClick(trace)}
                  >
                    <TableCell>
                      <StatusDot status={trace.status} />
                    </TableCell>
                    <TableCell className="font-medium">{trace.service}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {trace.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md px-2 py-0.5">
                        {trace.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCost(trace.costUsd)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums',
                        trace.latencyMs > 3000 && 'text-red-600 dark:text-red-400',
                        trace.latencyMs > 1500 &&
                          trace.latencyMs <= 3000 &&
                          'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {formatLatency(trace.latencyMs)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(trace.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Trace Detail Drawer */}
      <TraceDetailDrawer trace={selectedTrace} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
