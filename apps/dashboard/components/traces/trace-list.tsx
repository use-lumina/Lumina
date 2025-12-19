'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Filter, X } from 'lucide-react';
import type { Trace } from '@/app/traces/page';

interface TraceListProps {
  traces: Trace[];
}

export function TraceList({ traces }: TraceListProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

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
      !trace.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !trace.id.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleTraceClick = (trace: Trace) => {
    router.push(`/traces/${trace.id}`);
  };

  const getRowVariant = (status: Trace['status']) => {
    if (status === 'healthy') return 'success';
    if (status === 'degraded') return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
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
                  Search: &quot;{searchQuery}&quot;
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchQuery('')} />
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
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setTimeRange('all')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredTraces.length} of {traces.length} traces
        </div>
      </div>

      {/* Filter Inputs */}
      {showFilters && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Search endpoint or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
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

            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger>
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min cost ($)"
                value={minCost}
                onChange={(e) => setMinCost(e.target.value)}
                step="0.0001"
              />
              <Input
                type="number"
                placeholder="Max cost ($)"
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value)}
                step="0.0001"
              />
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
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

      {/* Traces Table */}
      <div className="rounded-lg border border-border bg-card">
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No traces found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredTraces.map((trace) => (
                <TableRow
                  key={trace.id}
                  data-variant={getRowVariant(trace.status)}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTraceClick(trace)}
                >
                  <TableCell>
                    <StatusDot status={trace.status} />
                  </TableCell>
                  <TableCell className="font-medium">{trace.service}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {trace.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {trace.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    ${trace.costUsd.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {trace.latencyMs}ms
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(trace.createdAt).toLocaleTimeString()}
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
