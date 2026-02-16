'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Filter, X, User, Clock, Search } from 'lucide-react';
import type { UITrace } from '@/types/trace';
import { cn } from '@/lib/utils';

interface TraceListProps {
  traces: UITrace[];
}

export function TraceList({ traces }: TraceListProps) {
  const router = useRouter();

  // Filter state
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minCost, setMinCost] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Extract unique values for filters
  const services = Array.from(new Set(traces.map((t) => t.service)));
  const models = Array.from(new Set(traces.map((t) => t.model)));

  // Filter traces
  const filteredTraces = traces.filter((trace) => {
    if (serviceFilter !== 'all' && trace.service !== serviceFilter) return false;
    if (modelFilter !== 'all' && trace.model !== modelFilter) return false;
    if (statusFilter !== 'all' && trace.status !== statusFilter) return false;
    if (
      searchQuery &&
      !trace.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !trace.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !trace.userId?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (minCost && parseFloat(minCost) > trace.costUsd) return false;
    if (maxCost && parseFloat(maxCost) < trace.costUsd) return false;
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
    searchQuery ||
    minCost ||
    maxCost ||
    timeRange !== 'all';

  const handleTraceClick = (trace: UITrace) => {
    router.push(`/traces/${trace.id}`);
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00';
    if (cost < 0.0001) return '<$0.0001';
    return `$${cost.toFixed(5)}`;
  };

  const getTotalTokens = (trace: UITrace) => {
    if (!trace.metadata) return '-';
    // Use type assertion here since we know metadata exists on UITrace but TS might be strict
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = trace.metadata as any;
    const tokensIn = metadata.tokensIn || 0;
    const tokensOut = metadata.tokensOut || 0;
    if (!tokensIn && !tokensOut) return '-';
    return (tokensIn + tokensOut).toLocaleString();
  };

  const getScoreBadge = (trace: UITrace) => {
    if (!trace.evaluations || trace.evaluations.length === 0) return null;

    // Calculate average score
    const avgScore =
      trace.evaluations.reduce((acc, curr) => acc + curr.score, 0) / trace.evaluations.length;

    // Determine color based on score (0-1 range)
    let colorClass = 'bg-secondary text-secondary-foreground';
    if (avgScore >= 0.8)
      colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    else if (avgScore < 0.5)
      colorClass = 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
    else colorClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20';

    return (
      <div
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
          colorClass
        )}
      >
        {avgScore.toFixed(2)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-1">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traces, users, or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="h-9 border-dashed">
                <Filter className="h-3.5 w-3.5 mr-2" />
                Filters
                {(serviceFilter !== 'all' || modelFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {[serviceFilter, modelFilter, statusFilter].filter((f) => f !== 'all').length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Status</h4>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="degraded">Degraded</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Service</h4>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Services" />
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
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Model</h4>
                  <Select value={modelFilter} onValueChange={setModelFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Models" />
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
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] h-9 border-dashed">
              <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="5m">Last 5 min</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              Reset
              <X className="ml-2 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {filteredTraces.length} traces
        </div>
      </div>

      {/* Traces Table - High Density */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="h-9 hover:bg-muted/40 border-b border-border">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="h-9 text-xs font-semibold">Trace / Endpoint</TableHead>
              <TableHead className="h-9 text-xs font-semibold">User</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Model</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Scores</TableHead>
              <TableHead className="h-9 text-xs font-semibold text-right">Tokens</TableHead>
              <TableHead className="h-9 text-xs font-semibold text-right">Cost</TableHead>
              <TableHead className="h-9 text-xs font-semibold text-right">Latency</TableHead>
              <TableHead className="h-9 text-xs font-semibold text-right w-[140px]">Time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredTraces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p>No traces found matching your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTraces.map((trace) => (
                <TableRow
                  key={trace.id}
                  className={cn(
                    'group cursor-pointer hover:bg-muted/40 h-10 border-b border-border/50',
                    trace.status === 'error' && 'bg-red-500/5 hover:bg-red-500/10'
                  )}
                  onClick={() => handleTraceClick(trace)}
                >
                  <TableCell className="py-1 px-4">
                    <StatusDot status={trace.status} className="h-2 w-2" />
                  </TableCell>
                  <TableCell className="py-1 font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium leading-none truncate max-w-[200px] md:max-w-[300px]">
                        {trace.endpoint}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        {trace.id.slice(0, 8)} • {trace.service}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1">
                    {trace.userId ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{trace.userId}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 font-normal bg-background/50"
                    >
                      {trace.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1">
                    {getScoreBadge(trace) || (
                      <span className="text-xs text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1 text-right text-xs text-muted-foreground font-mono">
                    {getTotalTokens(trace)}
                  </TableCell>
                  <TableCell className="py-1 text-right text-xs font-mono tabular-nums text-muted-foreground">
                    {formatCost(trace.costUsd)}
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <span
                      className={cn(
                        'text-xs font-mono font-medium tabular-nums px-1.5 py-0.5 rounded',
                        trace.latencyMs > 2000
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : trace.latencyMs > 5000
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'text-foreground'
                      )}
                    >
                      {trace.latencyMs}ms
                    </span>
                  </TableCell>
                  <TableCell className="py-1 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(trace.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: false,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
