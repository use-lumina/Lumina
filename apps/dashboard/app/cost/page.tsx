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
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Input } from '@/components/ui/input';

// Mock data for cost over time
const generateCostData = (view: 'hourly' | 'daily' | 'weekly') => {
  if (view === 'hourly') {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      cost: Math.random() * 50 + 20,
      requests: Math.floor(Math.random() * 1000 + 500),
    }));
  } else if (view === 'daily') {
    return Array.from({ length: 7 }, (_, i) => ({
      time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      cost: Math.random() * 500 + 200,
      requests: Math.floor(Math.random() * 10000 + 5000),
    }));
  } else {
    return Array.from({ length: 12 }, (_, i) => ({
      time: `Week ${i + 1}`,
      cost: Math.random() * 2000 + 1000,
      requests: Math.floor(Math.random() * 50000 + 20000),
    }));
  }
};

// Mock data for top endpoints
const topEndpoints = [
  {
    endpoint: '/chat/completions',
    model: 'gpt-4',
    requests: 45230,
    totalCost: 1245.67,
    avgCost: 0.0275,
    trend: 'up',
  },
  {
    endpoint: '/embeddings',
    model: 'text-embedding-3-large',
    requests: 89450,
    totalCost: 892.34,
    avgCost: 0.0099,
    trend: 'down',
  },
  {
    endpoint: '/chat/stream',
    model: 'claude-3-opus',
    requests: 12340,
    totalCost: 678.9,
    avgCost: 0.055,
    trend: 'up',
  },
  {
    endpoint: '/completions',
    model: 'gpt-4-turbo',
    requests: 8920,
    totalCost: 534.21,
    avgCost: 0.0599,
    trend: 'up',
  },
  {
    endpoint: '/chat/message',
    model: 'gpt-3.5-turbo',
    requests: 123450,
    totalCost: 456.78,
    avgCost: 0.0037,
    trend: 'stable',
  },
  {
    endpoint: '/analyze',
    model: 'claude-3-sonnet',
    requests: 5670,
    totalCost: 234.56,
    avgCost: 0.0414,
    trend: 'down',
  },
  {
    endpoint: '/summarize',
    model: 'gpt-4',
    requests: 3450,
    totalCost: 189.23,
    avgCost: 0.0548,
    trend: 'up',
  },
  {
    endpoint: '/translate',
    model: 'gpt-3.5-turbo',
    requests: 34560,
    totalCost: 145.67,
    avgCost: 0.0042,
    trend: 'stable',
  },
  {
    endpoint: '/code/review',
    model: 'gpt-4-turbo',
    requests: 2340,
    totalCost: 123.45,
    avgCost: 0.0527,
    trend: 'up',
  },
  {
    endpoint: '/search/semantic',
    model: 'text-embedding-ada',
    requests: 145670,
    totalCost: 98.76,
    avgCost: 0.0007,
    trend: 'down',
  },
];

// Mock data for model breakdown
const modelBreakdown = [
  { name: 'GPT-4', value: 1245.67, percentage: 35.2, color: 'hsl(var(--chart-1))' },
  { name: 'GPT-4 Turbo', value: 657.66, percentage: 18.6, color: 'hsl(var(--chart-2))' },
  { name: 'Claude 3 Opus', value: 678.9, percentage: 19.2, color: 'hsl(var(--chart-3))' },
  { name: 'GPT-3.5 Turbo', value: 602.45, percentage: 17.0, color: 'hsl(var(--chart-4))' },
  { name: 'Text Embedding', value: 991.1, percentage: 10.0, color: 'hsl(var(--chart-5))' },
];

// Cost spike alerts
const costAlerts = [
  { endpoint: '/chat/completions', spike: '+245%', time: '2 hours ago', severity: 'high' },
  { endpoint: '/chat/stream', spike: '+156%', time: '4 hours ago', severity: 'medium' },
];

const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export default function CostPage() {
  const router = useRouter();
  const [timeView, setTimeView] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<string>('all');
  const [minCostFilter, setMinCostFilter] = useState<string>('');
  const [maxCostFilter, setMaxCostFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const costData = generateCostData(timeView);

  const totalCost = topEndpoints.reduce((sum, e) => sum + e.totalCost, 0);
  const totalRequests = topEndpoints.reduce((sum, e) => sum + e.requests, 0);
  const avgCostPerRequest = totalCost / totalRequests;

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Get unique services and models for filter options
  const uniqueServices = Array.from(new Set(topEndpoints.map((e) => e.service)));
  const uniqueModels = Array.from(new Set(topEndpoints.map((e) => e.model)));

  // Apply all filters
  const filteredEndpoints = topEndpoints.filter((endpoint) => {
    // Model filter from pie chart
    if (selectedModel && !endpoint.model.includes(selectedModel)) return false;

    // Service filter
    if (serviceFilter.length > 0 && !serviceFilter.includes(endpoint.service)) return false;

    // Model filter from advanced filters
    if (modelFilter.length > 0 && !modelFilter.includes(endpoint.model)) return false;

    // Search query
    if (searchQuery && !endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;

    // Cost range filter
    const minCost = minCostFilter ? parseFloat(minCostFilter) : 0;
    const maxCost = maxCostFilter ? parseFloat(maxCostFilter) : Infinity;
    if (endpoint.totalCost < minCost || endpoint.totalCost > maxCost) return false;

    return true;
  });

  // Check if any filters are active
  const hasActiveFilters =
    dateRange !== 'all' ||
    minCostFilter !== '' ||
    maxCostFilter !== '' ||
    serviceFilter.length > 0 ||
    modelFilter.length > 0 ||
    searchQuery !== '';

  // Clear all filters
  const clearAllFilters = () => {
    setDateRange('all');
    setMinCostFilter('');
    setMaxCostFilter('');
    setServiceFilter([]);
    setModelFilter([]);
    setSearchQuery('');
    setSelectedModel(null);
  };

  const handlePieClick = (data: any) => {
    const modelName = data.name;
    setSelectedModel(selectedModel === modelName ? null : modelName);
  };

  const handleEndpointClick = (endpoint: string) => {
    router.push(`/traces?endpoint=${encodeURIComponent(endpoint)}`);
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
        {costAlerts.length > 0 && (
          <Card className="p-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Cost Spike Detected
                </h3>
                <div className="space-y-2">
                  {costAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm bg-background/50 rounded-md p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={alert.severity === 'high' ? 'destructive' : 'warning'}
                          className="font-mono"
                        >
                          {alert.spike}
                        </Badge>
                        <span className="font-medium">{alert.endpoint}</span>
                        <span className="text-muted-foreground">{alert.time}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        Investigate
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
                <p className="text-sm font-medium text-muted-foreground">Total Cost (24h)</p>
                <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <TrendingDown className="h-4 w-4" />
                  <span>8.2% vs yesterday</span>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-3">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6  border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold">{totalRequests.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>12.5% vs yesterday</span>
                </div>
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
                <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-500">
                  <TrendingDown className="h-4 w-4" />
                  <span>3.1% vs yesterday</span>
                </div>
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
          <Card className="p-6 lg:col-span-2  border-(--accent)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cost Over Time</h3>
                  <p className="text-sm text-muted-foreground">Track spending patterns</p>
                </div>
                <Select value={timeView} onValueChange={(v: any) => setTimeView(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ChartContainer config={chartConfig} className="h-75 w-full">
                <LineChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </Card>

          {/* Model Breakdown Pie Chart */}
          <Card className="p-6  border-(--accent)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cost by Model</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedModel ? 'Click to clear filter' : 'Click segments to filter table'}
                  </p>
                </div>
                {selectedModel && (
                  <Badge variant="secondary" className="gap-1">
                    Filtered: {selectedModel}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedModel(null)} />
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center">
                <PieChart width={250} height={250}>
                  <Pie
                    data={modelBreakdown}
                    cx={125}
                    cy={125}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handlePieClick}
                    className="cursor-pointer"
                  >
                    {modelBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={selectedModel && selectedModel !== entry.name ? 0.3 : 1}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-(--sidebar-border) bg-(--background) border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${data.value.toFixed(2)} ({data.percentage}%)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </div>
              <div className="space-y-2">
                {modelBreakdown.map((model, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: model.color }}
                      />
                      <span>{model.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">${model.value.toFixed(2)}</span>
                      <span className="text-muted-foreground">{model.percentage}%</span>
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
                      Showing {filteredEndpoints.length} of {topEndpoints.length} endpoints
                      {selectedModel && ` • Filtered by ${selectedModel}`}
                    </>
                  ) : (
                    'Highest cost endpoints in the last 24 hours'
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

            <div className="rounded-lg border  border-(--accent) border-border">
              <Table>
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
                          ${endpoint.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm text-muted-foreground">
                          ${endpoint.avgCost.toFixed(4)}
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
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
