'use client';

import { useState, useEffect, useMemo } from 'react';
import { TraceTableToolbar } from '@/components/traces/trace-table-toolbar';
import { TraceFilterPanel } from '@/components/traces/trace-filter-panel';
import { TraceTable } from '@/components/traces/trace-table';
import { TraceInspector } from '@/components/traces/trace-inspector';
import { getTraces, type Trace as APITrace } from '@/lib/api';
import type { UITrace, TraceSpan, HierarchicalSpan } from '@/types/trace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Map API trace to UI trace
function mapApiTraceToUI(trace: APITrace): UITrace {
  // Convert API Trace to HierarchicalSpan format
  const convertToHierarchicalSpan = (apiTrace: APITrace): HierarchicalSpan => {
    return {
      trace_id: apiTrace.trace_id,
      span_id: apiTrace.span_id,
      parent_span_id: apiTrace.parent_span_id,
      service_name: apiTrace.service_name,
      endpoint: apiTrace.endpoint,
      model: apiTrace.model,
      status: apiTrace.status,
      latency_ms: apiTrace.latency_ms,
      cost_usd: apiTrace.cost_usd,
      prompt_tokens: apiTrace.prompt_tokens,
      completion_tokens: apiTrace.completion_tokens,
      prompt: apiTrace.prompt,
      response: apiTrace.response,
      timestamp: apiTrace.timestamp,
      environment: apiTrace.environment,
      children: apiTrace.children ? apiTrace.children.map(convertToHierarchicalSpan) : [],
    };
  };

  const flattenSpans = (span: APITrace): TraceSpan[] => {
    const spans: TraceSpan[] = [
      {
        name: span.service_name,
        startMs: 0,
        durationMs: span.latency_ms,
        type: 'processing',
      },
    ];

    if (span.children && span.children.length > 0) {
      span.children.forEach((child) => {
        spans.push(...flattenSpans(child));
      });
    }

    return spans;
  };

  const spans = flattenSpans(trace);
  const hierarchicalSpan = convertToHierarchicalSpan(trace);

  return {
    id: trace.trace_id,
    createdAt: trace.timestamp,
    service: trace.service_name,
    endpoint: trace.endpoint,
    model: trace.model || 'unknown',
    status:
      trace.status === 'ok' || trace.status === 'healthy'
        ? 'healthy'
        : trace.status === 'degraded'
          ? 'degraded'
          : 'error',
    latencyMs: trace.latency_ms,
    costUsd: trace.cost_usd || 0,
    prompt: trace.prompt,
    response: trace.response,
    release: trace.environment || 'production',
    userId: undefined,
    sessionId: undefined,
    tags: [],
    metadata: {
      tokensIn: trace.prompt_tokens,
      tokensOut: trace.completion_tokens,
    },
    spans,
    hierarchicalSpan,
  };
}

export default function TracesPage() {
  const [traces, setTraces] = useState<UITrace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [environment, setEnvironment] = useState('all');
  /* Filters state matching TraceFilterPanel expectations */
  /* Filters state matching TraceFilterPanel expectations */
  const [filters, setFilters] = useState({
    environments: [] as string[],
    traceNames: [] as string[],
    userIds: [] as string[],
    sessionIds: [] as string[],
    tags: [] as string[],
    releases: [] as string[],
    statuses: [] as string[],
    // Keep internal status/model if needed, but 'statuses' array above now controls the panel
    status: [] as string[],
    model: [] as string[],
  });

  const [selectedTrace, setSelectedTrace] = useState<UITrace | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Fetch traces
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await getTraces({
          limit: 1000,
        });
        // Handle different API response formats
        const tracesData =
          (response as any).data || (response as any).traces || response.data || [];
        const uiTraces = Array.isArray(tracesData) ? tracesData.map(mapApiTraceToUI) : [];
        setTraces(uiTraces);
      } catch (error) {
        console.error('Failed to fetch traces:', error);
        setTraces([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleTraceSelect = (trace: UITrace) => {
    setSelectedTrace(trace);
  };

  // Bulk action handlers
  const handleDeleteSelected = () => {
    alert(`Delete ${selectedRows.size} trace(s)?`);
  };

  const handleAddToQueue = () => {
    alert(`Add ${selectedRows.size} trace(s) to annotation queue?`);
  };

  // Get unique values for filter options
  // Get unique values with counts for filter options
  const filterOptions = useMemo(() => {
    const counts = {
      environments: new Map<string, number>(),
      traceNames: new Map<string, number>(),
      userIds: new Map<string, number>(),
      sessionIds: new Map<string, number>(),
      tags: new Map<string, number>(),
      releases: new Map<string, number>(),
      statuses: new Map<string, number>(),
    };

    traces.forEach((trace) => {
      // Helper to increment map count
      const inc = (map: Map<string, number>, key?: string | null) => {
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      };

      inc(counts.environments, trace.hierarchicalSpan?.environment);
      inc(counts.traceNames, trace.endpoint);
      inc(counts.userIds, trace.userId);
      inc(counts.sessionIds, trace.sessionId);
      inc(counts.releases, trace.release);
      inc(counts.statuses, trace.status);

      trace.tags?.forEach((tag) => inc(counts.tags, tag));
    });

    // Helper to convert map to sorted options array
    const toOptions = (map: Map<string, number>) => {
      return Array.from(map.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };

    return {
      environments: toOptions(counts.environments),
      traceNames: toOptions(counts.traceNames),
      userIds: toOptions(counts.userIds),
      sessionIds: toOptions(counts.sessionIds),
      tags: toOptions(counts.tags),
      releases: toOptions(counts.releases),
      statuses: toOptions(counts.statuses),
    };
  }, [traces]);

  // Filter traces based on search and filters
  const filteredTraces = useMemo(() => {
    return traces.filter((trace) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = trace.id.toLowerCase().includes(query);
        const matchesEndpoint = trace.endpoint.toLowerCase().includes(query);
        const matchesService = trace.service.toLowerCase().includes(query);
        if (!matchesId && !matchesEndpoint && !matchesService) {
          return false;
        }
      }

      // Toolbar Environment filter (primary)
      if (environment !== 'all' && trace.hierarchicalSpan?.environment !== environment) {
        return false;
      }

      // Panel Filters (Arrays)
      if (
        filters.environments.length > 0 &&
        trace.hierarchicalSpan?.environment &&
        !filters.environments.includes(trace.hierarchicalSpan.environment)
      )
        return false;
      if (
        filters.traceNames.length > 0 &&
        trace.endpoint &&
        !filters.traceNames.includes(trace.endpoint)
      )
        return false;
      if (filters.userIds.length > 0 && trace.userId && !filters.userIds.includes(trace.userId))
        return false;
      if (
        filters.sessionIds.length > 0 &&
        trace.sessionId &&
        !filters.sessionIds.includes(trace.sessionId)
      )
        return false;
      if (filters.releases.length > 0 && trace.release && !filters.releases.includes(trace.release))
        return false;
      if (filters.statuses.length > 0 && trace.status && !filters.statuses.includes(trace.status))
        return false;

      // Tags filter (match any)
      if (filters.tags.length > 0) {
        const hasTag = trace.tags?.some((tag) => filters.tags.includes(tag));
        if (!hasTag) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(trace.status)) {
        return false;
      }

      // Model filter
      if (filters.model.length > 0 && !filters.model.includes(trace.model)) {
        return false;
      }

      return true;
    });
  }, [traces, searchQuery, environment, filters]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
      {/* Toolbar */}
      <TraceTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        onToggleFilters={() => setFiltersVisible(!filtersVisible)}
        filtersVisible={filtersVisible}
        availableEnvironments={filterOptions.environments.map((e) => e.value)}
        selectedCount={selectedRows.size}
        onDeleteSelected={handleDeleteSelected}
        onAddToQueue={handleAddToQueue}
      />

      {/* Content: Filter Panel + Table + Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Panel */}
        <TraceFilterPanel
          visible={filtersVisible}
          onClose={() => setFiltersVisible(false)}
          filters={filters}
          onFiltersChange={setFilters}
          availableOptions={filterOptions}
        />

        {/* Trace Table */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center w-full">
              <p className="text-sm text-slate-500">Loading traces...</p>
            </div>
          ) : (
            <TraceTable
              traces={filteredTraces}
              selectedTraceId={selectedTrace?.id || null}
              onTraceSelect={handleTraceSelect}
              selectedRows={selectedRows}
              onSelectedRowsChange={setSelectedRows}
            />
          )}

          {/* Trace Inspector */}
          {selectedTrace && (
            <TraceInspector trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
