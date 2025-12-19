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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  GitCompare,
  Users,
  BookOpen,
  Key,
  ArrowRight,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

// Mock data
const recentTraces = [
  {
    id: 'trace-1',
    service: 'chat-api',
    endpoint: '/chat/message',
    latency: 820,
    cost: 0.012,
    model: 'claude-3',
    time: '21:04:12',
    status: 'success' as const,
  },
  {
    id: 'trace-2',
    service: 'order-api',
    endpoint: '/checkout',
    latency: 3120,
    cost: 0.091,
    model: 'gpt-4',
    time: '21:04:08',
    status: 'success' as const,
  },
  {
    id: 'trace-3',
    service: 'chat-api',
    endpoint: '/chat/message',
    latency: 640,
    cost: 0.021,
    model: 'claude-3',
    time: '21:08:42',
    status: 'error' as const,
  },
];

// Seeded random function for consistent data between server and client
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const costChartData = {
  '24h': Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    cost: 4 + seededRandom(i) * 3 + Math.sin(i / 3) * 2,
  })),
  '7days': Array.from({ length: 7 }, (_, i) => ({
    time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    cost: 100 + seededRandom(i + 100) * 40 + i * 5,
  })),
  '30days': Array.from({ length: 30 }, (_, i) => ({
    time: `${i + 1}`,
    cost: 95 + seededRandom(i + 200) * 50 + Math.sin(i / 5) * 15,
  })),
};

const alerts = [
  {
    id: 'alert-1',
    severity: 'high' as const,
    title: 'Costs exceeding $25/day',
    time: '5 minutes ago',
    model: 'gpt-4',
  },
  {
    id: 'alert-2',
    severity: 'medium' as const,
    title: 'Latency over 2s on checkout endpoint',
    time: '12 minutes ago',
    service: 'order-api',
  },
];

const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export default function Home() {
  const router = useRouter();
  const [costTimeRange, setCostTimeRange] = useState<'24h' | '7days' | '30days'>('7days');
  const [tracesTimeRange, setTracesTimeRange] = useState('15min');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const totalCost = 128.97;
  const costChange = 9.2;
  const totalRequests = 76;

  // Calculate growth metrics
  const growthMetrics = {
    last24h: 7.2,
    weekOverWeek: 17,
    monthOverMonth: 2.5,
  };

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
            Lumina helps you monitor real-time traces, improve cost-efficiency, and ensure
            reliability of your AI models and applications.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Get Started Card */}
          <Card className="p-6 border-(--accent) animate-scale-in stagger-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Get Started</h2>
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
                  className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors"
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
                  className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors"
                >
                  <Circle className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Compare in Replay Studio</p>
                    <p className="text-xs text-muted-foreground">Re-run and optimize traces</p>
                  </div>
                </button>

                {/* Invite Teammates */}
                <button className="w-full flex items-start gap-3 text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors">
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
                  <span className="font-medium">25% done</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-1/4 rounded-full transition-all duration-500"></div>
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
                    {tracesTimeRange === '15min' ? '15 minutes' : tracesTimeRange}
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
                {recentTraces.map((trace) => (
                  <button
                    key={trace.id}
                    onClick={() => router.push(`/traces/${trace.id}`)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border border-transparent hover:border-border"
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        trace.status === 'success' ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{trace.service}</span>
                        <span className="text-muted-foreground text-sm font-mono">
                          {trace.endpoint}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{trace.latency} ms</span>
                        <span>·</span>
                        <span>${trace.cost.toFixed(3)}</span>
                        <span>·</span>
                        <span>{trace.model}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0">{trace.time}</div>
                  </button>
                ))}
              </div>

              {/* Growth Metrics */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                    +{growthMetrics.last24h}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Increase
                    <br />
                    last 24 hours
                  </div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                    +{growthMetrics.weekOverWeek}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Week over week
                    <br />
                    Gently
                  </div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                    +{growthMetrics.monthOverMonth}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Month over mon
                    <br />
                    Gently
                  </div>
                </div>
              </div>

              {/* View All Link */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/traces')}
                  className="w-full justify-center group"
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
                  <h2 className="text-xl font-semibold mb-1">Cost This Month</h2>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Cost Display */}
              <div>
                <div className="text-4xl font-bold mb-2">${totalCost.toFixed(2)}</div>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+${costChange.toFixed(2)} past 24h</span>
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
              <div className="h-50 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costChartData[costTimeRange]}>
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
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-semibold">
                                ${value.toFixed(2)}
                              </p>
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
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div
                      className={`rounded-full p-1.5 shrink-0 ${
                        alert.severity === 'high'
                          ? 'bg-red-100 dark:bg-red-950'
                          : 'bg-amber-100 dark:bg-amber-950'
                      }`}
                    >
                      {alert.severity === 'high' ? (
                        <DollarSign className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                      {alert.model && (
                        <p className="text-xs text-muted-foreground mt-1">Model: {alert.model}</p>
                      )}
                      {alert.service && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Service: {alert.service}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* View All Link */}
              <div className="pt-2">
                <Button variant="ghost" className="w-full justify-center group">
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
