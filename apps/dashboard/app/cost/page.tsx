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
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import {
  KPICardSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
} from '@/components/ui/loading-skeletons';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  X,
  Filter,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  getCostTimeline,
  getCostBreakdown,
  getCostSummary,
  getCostAnomalies,
  getEndpointTrends,
  getTraces,
} from '@/lib/api';
import { cn } from '@/lib/utils';

interface EndpointData {
  endpoint: string;
  model: string;
  requests: number;
  totalCost: number;
  avgCost: number;
  trend: string;
}

export default function CostPage() {
  const [timeView, setTimeView] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Data state
  const [costData, setCostData] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointData[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [costAnomalies, setCostAnomalies] = useState<any[]>([]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [minCostFilter, setMinCostFilter] = useState('');
  const [maxCostFilter, setMaxCostFilter] = useState('');
  const [_dateRange, _setDateRange] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEndpoints, setTotalEndpoints] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const router = useRouter();

  // Fetch cost data
  const fetchCostData = async () => {
    try {
      const now = new Date();
      let startTime = new Date();
      let granularity: 'hour' | 'day' | 'week' = 'day';

      if (timeView === '24h') {
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        granularity = 'hour';
      } else if (timeView === '7d') {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = 'day';
      } else {
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        granularity = 'day';
      }

      // Fetch timeline data
      const timeline = await getCostTimeline({
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        granularity,
      });

      const chartData = timeline.data.map((item) => {
        const date = new Date(item.time_bucket);
        let timeLabel = '';

        if (timeView === '24h') {
          timeLabel = `${date.getHours().toString().padStart(2, '0')}:00`;
        } else {
          timeLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        }

        return {
          time: timeLabel,
          cost: parseFloat(item.total_cost.toString()),
          requests: item.request_count,
        };
      });
      setCostData(chartData);

      // Calculate offset for pagination
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // Fetch endpoint breakdown with pagination
      const breakdownData = await getCostBreakdown({
        groupBy: 'endpoint',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        limit: ITEMS_PER_PAGE,
        offset: offset,
      });

      // Fetch endpoint trends to get real trend data
      const trendsData = await getEndpointTrends({
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        limit: 20,
      });

      // Create a map of trends by endpoint
      const trendsMap = new Map();
      trendsData.data.forEach((item) => {
        trendsMap.set(item.endpoint, item.trend);
      });

      const formattedEndpoints: EndpointData[] = breakdownData.data.map((item: any) => ({
        endpoint: item.group_name,
        model: item.model || '-',
        requests: item.request_count,
        totalCost: parseFloat(item.total_cost.toString()),
        avgCost: parseFloat(item.avg_cost.toString()),
        trend: trendsMap.get(item.group_name) || 'stable',
      }));
      setEndpoints(formattedEndpoints);
      setTotalEndpoints(breakdownData.pagination?.total || breakdownData.data.length);

      // Fetch model breakdown
      const modelData = await getCostBreakdown({
        groupBy: 'model',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      });

      // Professional color palette for charts
      const colors = [
        'hsl(221, 83%, 53%)', // Blue
        'hsl(142, 76%, 36%)', // Green
        'hsl(262, 83%, 58%)', // Purple
        'hsl(34, 100%, 50%)', // Orange
        'hsl(346, 77%, 50%)', // Red
        'hsl(199, 89%, 48%)', // Cyan
      ];

      const formattedModelBreakdown = modelData.data.map((item: any, index: number) => ({
        name: item.group_name,
        value: parseFloat(item.total_cost.toString()),
        percentage: item.percentage,
        color: colors[index % colors.length],
      }));
      setModelBreakdown(formattedModelBreakdown);

      // Fetch cost summary
      const summary = await getCostSummary({
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      });
      setCostSummary(summary);

      // Fetch anomalies
      const anomalies = await getCostAnomalies({
        limit: 5,
      });
      setCostAnomalies(anomalies.data);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    }
  };

  // Initial load and data fetching
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchCostData();
      setIsLoading(false);
    }

    loadData();
  }, [timeView, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [timeView, searchQuery, minCostFilter, maxCostFilter, selectedModel]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(async () => {
      await fetchCostData();
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoading, timeView, currentPage]);

  // Handle edge case: if current page becomes invalid, go to last valid page
  useEffect(() => {
    const totalPages = Math.ceil(totalEndpoints / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalEndpoints, currentPage, ITEMS_PER_PAGE]);

  const totalCost = costSummary?.summary?.total_cost || 0;
  const totalRequests = costSummary?.summary?.total_requests || 0;
  const avgCostPerRequest = costSummary?.summary?.avg_cost || 0;

  // Helper function to format cost with appropriate decimal places
  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  // Get unique services and models from endpoints
  const uniqueServices = Array.from(
    new Set(endpoints.map((e) => e.endpoint.split('/')[1] || 'unknown'))
  );
  const uniqueModels = Array.from(new Set(endpoints.map((e) => e.model).filter(Boolean)));

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery !== '' ||
    serviceFilter.length > 0 ||
    modelFilter.length > 0 ||
    minCostFilter !== '' ||
    maxCostFilter !== '';

  // Apply filters
  const filteredEndpoints = endpoints.filter((endpoint) => {
    if (searchQuery && !endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (minCostFilter && endpoint.totalCost < parseFloat(minCostFilter)) return false;
    if (maxCostFilter && endpoint.totalCost > parseFloat(maxCostFilter)) return false;
    return true;
  });

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedModel(null);
    setServiceFilter([]);
    setModelFilter([]);
    setMinCostFilter('');
    setMaxCostFilter('');
  };

  const handlePieClick = (data: any) => {
    const modelName = data.name;
    setSelectedModel(selectedModel === modelName ? null : modelName);
  };

  const handleEndpointClick = async (endpoint: string) => {
    try {
      // Find the most expensive trace for this endpoint
      // We'll search for traces for this endpoint, sorted by cost descending
      const response = await getTraces({
        endpoint,
        model: selectedModel || undefined,
        limit: 1,
        sortBy: 'cost_usd',
        sortOrder: 'desc',
      });

      const traces = response.data || [];

      if (traces.length > 0) {
        // Navigate directly to the most expensive trace
        router.push(`/traces?id=${traces[0].trace_id}`);
      } else {
        // Fallback: Navigate to traces page with filters if no specific trace found
        const params = new URLSearchParams();
        params.set('endpoint', endpoint);
        if (selectedModel) {
          params.set('model', selectedModel);
        }
        params.set('timeRange', timeView);
        router.push(`/traces?${params.toString()}`);
      }
    } catch (error) {
      console.error('Failed to find top trace for endpoint:', error);
      // Fallback on error
      const params = new URLSearchParams();
      params.set('endpoint', endpoint);
      if (selectedModel) {
        params.set('model', selectedModel);
      }
      params.set('timeRange', timeView);
      router.push(`/traces?${params.toString()}`);
    }
  };

  // Highlight search term in endpoint name
  const highlightSearch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-primary/20 text-foreground px-0.5 rounded shadow-[0_0_8px_rgba(var(--primary),0.2)]"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Cost Dashboard</h1>
            <p className="text-muted-foreground">Monitor and analyze your API costs</p>
          </div>

          {/* KPI Cards Loading */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>

          {/* Charts Loading */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCardSkeleton className="lg:col-span-2" />
            <ChartCardSkeleton />
          </div>

          {/* Table Loading */}
          <Card className="p-6 border-border">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Top 10 Most Expensive Endpoints</h3>
                <p className="text-sm text-muted-foreground">
                  Highest cost endpoints in the last 24 hours
                </p>
              </div>
              <TableSkeleton rows={10} columns={8} />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header & Integrated Toolbar */}
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Cost Analysis</h1>
              <p className="text-[11px] text-muted-foreground font-medium">
                Monitor and optimize your LLM spending across all services
              </p>
            </div>
            <RealtimeIndicator lastUpdated={lastUpdated} isLive={true} />
          </div>

          <div className="flex items-center gap-2 h-10 px-2 bg-card border border-border/60 rounded-md shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-8 pr-3 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <Select value={timeView} onValueChange={(v: any) => setTimeView(v)}>
              <SelectTrigger className="h-7 w-32 border-none bg-transparent shadow-none text-[11px] font-medium hover:bg-accent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'h-7 text-[11px] font-bold uppercase tracking-tight gap-2 hover:bg-accent',
                showFilters && 'bg-accent'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
              {hasActiveFilters && (
                <div className="ml-0.5 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
                  {[
                    serviceFilter.length,
                    modelFilter.length,
                    minCostFilter ? 1 : 0,
                    maxCostFilter ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}
                </div>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="p-3 bg-accent/10 border border-border rounded-md animate-scale-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Service Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                  Service
                </label>
                <Select
                  value={serviceFilter.length === 1 ? serviceFilter[0] : 'multiple'}
                  onValueChange={(value) => {
                    if (value === 'all') setServiceFilter([]);
                    else if (serviceFilter.includes(value)) {
                      setServiceFilter(serviceFilter.filter((s) => s !== value));
                    } else {
                      setServiceFilter([...serviceFilter, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-[11px] bg-background border-border/50">
                    <SelectValue
                      placeholder={
                        serviceFilter.length > 0
                          ? `${serviceFilter.length} Selected`
                          : 'All Services'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {uniqueServices.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                  Model
                </label>
                <Select
                  value={modelFilter.length === 1 ? modelFilter[0] : 'multiple'}
                  onValueChange={(value) => {
                    if (value === 'all') setModelFilter([]);
                    else if (modelFilter.includes(value)) {
                      setModelFilter(modelFilter.filter((m) => m !== value));
                    } else {
                      setModelFilter([...modelFilter, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-[11px] bg-background border-border/50">
                    <SelectValue
                      placeholder={
                        modelFilter.length > 0 ? `${modelFilter.length} Selected` : 'All Models'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {uniqueModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Range */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                  Cost Range ($)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minCostFilter}
                    onChange={(e) => setMinCostFilter(e.target.value)}
                    className="h-8 text-[11px] bg-background border-border/50"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxCostFilter}
                    onChange={(e) => setMaxCostFilter(e.target.value)}
                    className="h-8 text-[11px] bg-background border-border/50"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-2">
                Search: {searchQuery}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                />
              </Badge>
            )}
            {serviceFilter.map((service) => (
              <Badge key={service} variant="secondary" className="gap-2">
                Service: {service}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-foreground"
                  onClick={() => setServiceFilter(serviceFilter.filter((s) => s !== service))}
                />
              </Badge>
            ))}
            {modelFilter.map((model) => (
              <Badge key={model} variant="secondary" className="gap-2">
                Model: {model}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-foreground"
                  onClick={() => setModelFilter(modelFilter.filter((m) => m !== model))}
                />
              </Badge>
            ))}
            {minCostFilter && (
              <Badge variant="secondary" className="gap-2">
                Min: ${minCostFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-foreground"
                  onClick={() => setMinCostFilter('')}
                />
              </Badge>
            )}
            {maxCostFilter && (
              <Badge variant="secondary" className="gap-2">
                Max: ${maxCostFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-foreground"
                  onClick={() => setMaxCostFilter('')}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Cost Spike Alerts */}
        {costAnomalies.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20">
                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tight">
                    Cost Anomalies Detected
                  </h3>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {costAnomalies.length} active alerts
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {costAnomalies.slice(0, 4).map((alert, i) => (
                    <div
                      key={alert.alert_id || i}
                      className="flex items-center justify-between bg-card/50 border border-amber-500/20 rounded px-2 py-1.5 group cursor-pointer hover:border-amber-500/50 transition-colors"
                      onClick={() => {
                        if (alert.trace_id) {
                          router.push(`/traces?id=${alert.trace_id}`);
                        } else {
                          router.push(`/alerts?id=${alert.alert_id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className="h-3.5 px-1 text-[8px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-400 border-none"
                        >
                          +{alert.cost_increase_percent?.toFixed(0)}%
                        </Badge>
                        <span className="text-[10px] font-medium text-foreground/80 truncate">
                          {alert.endpoint}
                        </span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3 border-border bg-card shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Total Cost
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {formatCost(totalCost)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  {totalRequests.toLocaleString()} reqs
                </Badge>
              </div>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          </Card>

          <Card className="p-3 border-border bg-card shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Total Requests
                </p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {totalRequests.toLocaleString()}
                </p>
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[9px] font-mono bg-primary/10 text-primary border-primary/20"
                >
                  Across all services
                </Badge>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          </Card>

          <Card className="p-3 border-border bg-card shadow-sm relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Avg Cost/Request
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    ${avgCostPerRequest.toFixed(4)}
                  </p>
                </div>
                {costSummary?.summary?.p95_cost && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-mono bg-purple-500/10 text-purple-600 border-purple-500/20"
                  >
                    P95: ${parseFloat(costSummary.summary.p95_cost.toString()).toFixed(4)}
                  </Badge>
                )}
              </div>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 lg:col-span-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight">
                    Cost Over Time
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Spending trends based on selected model and service filters
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      vertical={false}
                      className="text-border"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="currentColor"
                      className="text-muted-foreground"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      stroke="currentColor"
                      className="text-muted-foreground"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                          const requests = payload[0].payload.requests || 0;
                          return (
                            <div className="bg-card border border-border rounded px-2 py-1.5 shadow-md">
                              <p className="text-[10px] font-bold text-foreground">
                                {formatCost(value)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                  {requests} requests
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{
                        stroke: '#6366f1',
                        strokeWidth: 1,
                        strokeDasharray: '3 3',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      fill="url(#costGradient)"
                      activeDot={{ r: 3, strokeWidth: 0, fill: '#6366f1' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Model Breakdown Pie Chart */}
          <Card className="p-4 border-border bg-card shadow-sm">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight">
                  Cost by Model
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Click to filter expense table
                </p>
              </div>

              <div className="flex items-center justify-center h-48">
                <PieChart width={180} height={180}>
                  <Pie
                    data={modelBreakdown}
                    cx={90}
                    cy={90}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handlePieClick}
                  >
                    {modelBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={selectedModel && selectedModel !== entry.name ? 0.3 : 1}
                        className="cursor-pointer transition-opacity outline-none"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded px-2 py-1.5 shadow-md">
                            <p className="text-[10px] font-bold text-foreground">{data.name}</p>
                            <p className="text-[10px] text-primary font-mono">
                              {formatCost(data.value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                {modelBreakdown.map((model, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between p-1 rounded transition-colors cursor-pointer hover:bg-accent/40',
                      selectedModel === model.name && 'bg-accent'
                    )}
                    onClick={() => handlePieClick({ name: model.name })}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: model.color }}
                      />
                      <span className="text-[10px] font-medium text-foreground/80 truncate">
                        {model.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-foreground">
                      {model.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Top 10 Most Expensive Endpoints */}
        <Card className="p-4 border-border bg-card shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight">
                  Expensive Endpoints
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {hasActiveFilters || selectedModel ? (
                    <>
                      Showing {filteredEndpoints.length} of {endpoints.length} endpoints
                      {selectedModel && ` • Filtered by ${selectedModel}`}
                    </>
                  ) : (
                    'Highest cost endpoints in the selected time range'
                  )}
                </p>
              </div>
              {(hasActiveFilters || selectedModel) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-[10px] uppercase font-bold gap-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="relative w-full overflow-x-auto">
              <table className="w-full caption-bottom text-[11px]">
                <thead>
                  <tr className="hover:bg-transparent border-b border-border h-8 bg-accent/30">
                    <th className="w-10 h-8 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      #
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Endpoint
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Model
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      Requests
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      Total Cost
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      Avg Cost
                    </th>
                    <th className="h-8 px-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-center">
                      Trend
                    </th>
                    <th className="w-10 h-8 px-2"></th>
                  </tr>
                </thead>
                <TableBody>
                  {filteredEndpoints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground/60">
                        No endpoints found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEndpoints.map((endpoint, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer hover:bg-accent/40 transition-colors border-b border-border/50 h-8 group"
                        onClick={() => handleEndpointClick(endpoint.endpoint)}
                      >
                        <TableCell className="px-2 py-1.5 font-medium text-muted-foreground font-mono">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 font-mono text-[11px] text-foreground/80 max-w-xs truncate">
                          {highlightSearch(endpoint.endpoint, searchQuery)}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Badge
                            variant="outline"
                            className="h-4 px-1 text-[9px] font-mono text-muted-foreground border-border uppercase"
                          >
                            {endpoint.model}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums text-foreground/70">
                          {endpoint.requests.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-foreground">
                          {formatCost(endpoint.totalCost)}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums text-[10px] text-muted-foreground">
                          {formatCost(endpoint.avgCost)}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          {endpoint.trend === 'up' && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[9px] gap-1 bg-destructive/10 text-destructive border-destructive/20"
                            >
                              <TrendingUp className="h-2.5 w-2.5" />
                              UP
                            </Badge>
                          )}
                          {endpoint.trend === 'down' && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[9px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            >
                              <TrendingDown className="h-2.5 w-2.5" />
                              DOWN
                            </Badge>
                          )}
                          {endpoint.trend === 'stable' && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[9px] text-muted-foreground border-border"
                            >
                              STABLE
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndpointClick(endpoint.endpoint);
                            }}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>

              {/* Pagination */}
              {filteredEndpoints.length > 0 && totalEndpoints > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-accent/10">
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalEndpoints)} of {totalEndpoints}
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    totalItems={totalEndpoints}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
