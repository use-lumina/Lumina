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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [dateRange, setDateRange] = useState('all');

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

  const handleEndpointClick = (endpoint: string) => {
    // Navigate to traces page with filters
    const params = new URLSearchParams();
    params.set('endpoint', endpoint);
    if (selectedModel) {
      params.set('model', selectedModel);
    }
    // Also set the time range to match context
    params.set('timeRange', timeView);

    router.push(`/traces?${params.toString()}`);
  };

  // Highlight search term in endpoint name
  const highlightSearch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground px-0.5 rounded"
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
          <Card className="p-6 border-(--accent)">
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
        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Cost Dashboard</h1>
            <p className="text-muted-foreground">Monitor and analyze your API costs</p>
          </div>
          <div className="flex items-center gap-3">
            <RealtimeIndicator lastUpdated={lastUpdated} isLive={true} />
            <Button
              variant={showFilters ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {[
                    serviceFilter.length,
                    modelFilter.length,
                    minCostFilter ? 1 : 0,
                    maxCostFilter ? 1 : 0,
                    searchQuery ? 1 : 0,
                  ]
                    .filter((n) => n > 0)
                    .reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4 border-(--accent) animate-scale-in">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date Range */}
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>

                {/* Service Filter */}
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
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        serviceFilter.length > 0
                          ? `${serviceFilter.length} service${serviceFilter.length > 1 ? 's' : ''}`
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

                {/* Model Filter */}
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
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        modelFilter.length > 0
                          ? `${modelFilter.length} model${modelFilter.length > 1 ? 's' : ''}`
                          : 'All Models'
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

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearAllFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Cost Range */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Cost Range:</label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    placeholder="Min ($)"
                    value={minCostFilter}
                    onChange={(e) => setMinCostFilter(e.target.value)}
                    className="w-full"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max ($)"
                    value={maxCostFilter}
                    onChange={(e) => setMaxCostFilter(e.target.value)}
                    className="w-full"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </Card>
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
          <Card className="p-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Cost Anomalies Detected
                </h3>
                <div className="space-y-2">
                  {costAnomalies.slice(0, 3).map((alert, i) => (
                    <div
                      key={alert.alert_id || i}
                      className="flex items-center justify-between text-sm bg-background/50 rounded-md p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={alert.severity === 'HIGH' ? 'destructive' : 'warning'}
                          className="font-mono"
                        >
                          +{alert.cost_increase_percent?.toFixed(0)}%
                        </Badge>
                        <span className="font-medium">{alert.endpoint}</span>
                        <span className="text-muted-foreground">
                          ${alert.current_cost?.toFixed(4)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (window.location.href = `/alerts/${alert.alert_id}`)}
                      >
                        View
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Cost ({timeView === '24h' ? '24h' : timeView === '7d' ? '7d' : '30d'})
                </p>
                <p className="text-3xl font-bold">{formatCost(totalCost)}</p>
                {totalCost > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{totalRequests} requests</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-3">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6  border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Requests ({timeView === '24h' ? '24h' : timeView === '7d' ? '7d' : '30d'})
                </p>
                <p className="text-3xl font-bold">{totalRequests.toLocaleString()}</p>
                {totalCost > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{formatCost(totalCost)} total</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6  border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Cost/Request</p>
                <p className="text-3xl font-bold">${avgCostPerRequest.toFixed(4)}</p>
                {costSummary?.summary?.p95_cost && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>
                      P95: ${parseFloat(costSummary.summary.p95_cost.toString()).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-purple-100 dark:bg-purple-950 p-3">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Over Time Chart */}
          <Card className="p-6 lg:col-span-2 border-(--accent)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cost Over Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Track spending patterns and trends
                  </p>
                </div>
                <Select value={timeView} onValueChange={(v: any) => setTimeView(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-75 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="var(--foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      height={40}
                      opacity={0.7}
                    />
                    <YAxis
                      stroke="var(--foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={60}
                      tickFormatter={(value) => formatCost(value).replace('$', '$')}
                      opacity={0.7}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                          const requests = payload[0].payload.requests || 0;
                          return (
                            <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
                              <p className="text-xs text-muted-foreground mb-1">
                                {payload[0].payload.time}
                              </p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-lg font-bold text-primary">
                                  {formatCost(value)}
                                </p>
                                <p className="text-xs text-muted-foreground">total cost</p>
                              </div>
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <p className="text-sm text-foreground">
                                  {requests.toLocaleString()} requests
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                ${requests > 0 ? (value / requests).toFixed(4) : '0.0000'} avg per
                                request
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{
                        stroke: 'var(--primary)',
                        strokeWidth: 1,
                        strokeDasharray: '5 5',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#costGradient)"
                      activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--background)' }}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {costData.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-(--border)">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">Total Cost</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{costData.length} data points</div>
                </div>
              )}
            </div>
          </Card>

          {/* Model Breakdown Pie Chart */}
          <Card className="p-6 border-(--accent)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cost by Model</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedModel ? 'Click badge to clear' : 'Interactive breakdown'}
                  </p>
                </div>
                {selectedModel && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => setSelectedModel(null)}
                  >
                    {selectedModel}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              <div className="relative">
                <div className="flex items-center justify-center">
                  <PieChart width={280} height={280}>
                    <defs>
                      {modelBreakdown.map((entry, index) => (
                        <filter key={`shadow-${index}`} id={`shadow-${index}`} height="200%">
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="3"
                            floodColor={entry.color}
                            floodOpacity="0.3"
                          />
                        </filter>
                      ))}
                    </defs>
                    <Pie
                      data={modelBreakdown}
                      cx={140}
                      cy={140}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={handlePieClick}
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {modelBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={selectedModel && selectedModel !== entry.name ? 0.2 : 1}
                          className="cursor-pointer transition-all duration-200 hover:opacity-90"
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
                            <div className="bg-popover/95 backdrop-blur-sm border border-(--border) rounded-lg px-4 py-3 shadow-xl">
                              <p className="font-semibold text-sm mb-1">{data.name}</p>
                              <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                  <p className="text-lg font-bold text-primary">
                                    {formatCost(data.value)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {data.percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                                Click to filter table
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </div>
                {modelBreakdown.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {formatCost(modelBreakdown.reduce((sum, m) => sum + m.value, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2.5 pt-2 border-t border-(--border)">
                {modelBreakdown.map((model, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md transition-all cursor-pointer hover:bg-muted/50',
                      selectedModel === model.name && 'bg-muted'
                    )}
                    onClick={() => handlePieClick({ name: model.name })}
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <div
                        className="h-3 w-3 rounded-full ring-2 ring-background shadow-sm"
                        style={{ backgroundColor: model.color }}
                      />
                      <span className="text-sm font-medium truncate">{model.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCost(model.value)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium min-w-[3rem] text-right">
                        {model.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Top 10 Most Expensive Endpoints */}
        <Card className="p-6  border-(--border)">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Expensive Endpoints</h3>
                <p className="text-sm text-muted-foreground">
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
                <Button variant="secondary" size="sm" onClick={clearAllFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>

            <div className="relative w-full overflow-x-auto rounded-lg border border-(--border)">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="w-25"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEndpoints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No endpoints found for {selectedModel}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEndpoints.map((endpoint, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-(--border)"
                        onClick={() => handleEndpointClick(endpoint.endpoint)}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {highlightSearch(endpoint.endpoint, searchQuery)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {endpoint.model}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {endpoint.requests.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {formatCost(endpoint.totalCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm text-muted-foreground">
                          {formatCost(endpoint.avgCost)}
                        </TableCell>
                        <TableCell className="text-center">
                          {endpoint.trend === 'up' && (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Up
                            </Badge>
                          )}
                          {endpoint.trend === 'down' && (
                            <Badge variant="success" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Down
                            </Badge>
                          )}
                          {endpoint.trend === 'stable' && (
                            <Badge variant="secondary" className="gap-1">
                              Stable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndpointClick(endpoint.endpoint);
                            }}
                          >
                            View Traces
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>

              {/* Pagination */}
              {filteredEndpoints.length > 0 && totalEndpoints > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalEndpoints)} of {totalEndpoints}{' '}
                    endpoints
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
