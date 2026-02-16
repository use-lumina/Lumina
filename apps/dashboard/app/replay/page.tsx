'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { KPICardSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Play,
  Plus,
  GitCompare,
  Clock,
  DollarSign,
  TrendingDown,
  X,
  Sparkles,
  FileText,
  Check,
  Trash2,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getReplaySets,
  createReplaySet,
  runReplay,
  getTraces,
  getReplayDetails,
  getReplayDiff,
  deleteReplaySet,
  type ReplaySet,
  type ReplayResult,
  type ReplaySummary,
} from '@/lib/api';

function formatDateISO(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    return String(dateStr);
  }
}

export default function ReplayPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [runDrawerOpen, setRunDrawerOpen] = useState(false);
  const [resultsDrawerOpen, setResultsDrawerOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<ReplaySet | null>(null);
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);
  const [replaySets, setReplaySets] = useState<ReplaySet[]>([]);
  const [availableTraces, setAvailableTraces] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [replayResults, setReplayResults] = useState<ReplayResult[]>([]);
  const [replaySummary, setReplaySummary] = useState<ReplaySummary | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReplaySets, setTotalReplaySets] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Replay configuration
  const [replayName, setReplayName] = useState('');
  const [replayDescription, setReplayDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('500');
  const [promptTemplate, setPromptTemplate] = useState('');

  // Fetch replay sets and traces
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const [replaySetsResponse, tracesResponse] = await Promise.all([
          getReplaySets({ limit: ITEMS_PER_PAGE, offset }),
          getTraces({ limit: 50 }),
        ]);
        setReplaySets(replaySetsResponse.data || []);
        setTotalReplaySets(replaySetsResponse.pagination.total);
        setAvailableTraces(tracesResponse.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setReplaySets([]);
        setAvailableTraces([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  // Handle edge case: if current page becomes invalid, go to last valid page
  useEffect(() => {
    const totalPages = Math.ceil(totalReplaySets / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalReplaySets, currentPage, ITEMS_PER_PAGE]);

  const handleToggleTrace = (traceId: string) => {
    setSelectedTraces((prev) =>
      prev.includes(traceId) ? prev.filter((id) => id !== traceId) : [...prev, traceId]
    );
  };

  const handleCreateReplaySet = async () => {
    if (!replayName || selectedTraces.length === 0) return;

    try {
      setIsCreating(true);
      const response = await createReplaySet({
        name: replayName,
        description: replayDescription,
        traceIds: selectedTraces,
      });

      if (response.success) {
        // Refresh replay sets - reset to page 1
        setCurrentPage(1);
        const offset = 0; // First page
        const replaySetsResponse = await getReplaySets({ limit: ITEMS_PER_PAGE, offset });
        setReplaySets(replaySetsResponse.data || []);
        setTotalReplaySets(replaySetsResponse.pagination.total);
        setCreateDrawerOpen(false);
        setSelectedTraces([]);
        setReplayName('');
        setReplayDescription('');
      }
    } catch (error) {
      console.error('Failed to create replay set:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunReplay = async () => {
    if (!selectedSet) return;

    try {
      setIsRunning(true);
      await runReplay(selectedSet.replay_id);

      // Refresh replay sets to get updated status
      const replaySetsResponse = await getReplaySets({ limit: 50 });
      setReplaySets(replaySetsResponse.data || []);

      setRunDrawerOpen(false);

      // Fetch and display results
      await handleViewResults(selectedSet);
    } catch (error) {
      console.error('Failed to run replay:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteReplaySet = async (replayId: string) => {
    if (
      !confirm('Are you sure you want to delete this replay set? This action cannot be undone.')
    ) {
      return;
    }

    try {
      await deleteReplaySet(replayId);

      // Refresh the list
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const replaySetsResponse = await getReplaySets({ limit: ITEMS_PER_PAGE, offset });
      setReplaySets(replaySetsResponse.data || []);
      setTotalReplaySets(replaySetsResponse.pagination.total);
    } catch (error) {
      console.error('Failed to delete replay set:', error);
      alert('Failed to delete replay set. Please try again.');
    }
  };

  const handleViewResults = async (replaySet: ReplaySet) => {
    setSelectedSet(replaySet);
    setResultsDrawerOpen(true);

    try {
      setIsLoadingResults(true);
      const [detailsResponse, diffResponse] = await Promise.all([
        getReplayDetails(replaySet.replay_id),
        getReplayDiff(replaySet.replay_id, { limit: 50 }),
      ]);

      setReplaySummary(detailsResponse.summary);

      // Normalize numeric fields on results (Postgres/JSON may return strings)
      function normalizeResult(r: any) {
        const normalized = { ...r };
        normalized.original_cost = Number(r.original_cost) || 0;
        normalized.replay_cost = Number(r.replay_cost) || 0;
        normalized.original_latency = Number(r.original_latency) || 0;
        normalized.replay_latency = Number(r.replay_latency) || 0;
        normalized.hash_similarity = Number(r.hash_similarity) || 0;
        normalized.semantic_score = Number(r.semantic_score) || 0;
        // diff_summary may come as object or stringified JSON
        const ds =
          typeof r.diff_summary === 'string'
            ? JSON.parse(r.diff_summary || '{}')
            : r.diff_summary || {};
        normalized.diff_summary = {
          cost_diff: Number(ds.cost_diff) || 0,
          cost_diff_percent: Number(ds.cost_diff_percent) || 0,
          latency_diff: Number(ds.latency_diff) || 0,
          latency_diff_percent: Number(ds.latency_diff_percent) || 0,
          response_changed: Boolean(ds.response_changed),
        };
        return normalized as ReplayResult;
      }

      setReplayResults((diffResponse.data || []).map(normalizeResult));
    } catch (error) {
      console.error('Failed to fetch replay results:', error);
      setReplaySummary(null);
      setReplayResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Helper to normalize numeric fields returned from the API (postgres may return DECIMAL as strings)
  function normalizeSummary(s: ReplaySummary | null) {
    if (!s) return null;
    return {
      total_results: Number(s.total_results ?? s.total_results) || 0,
      avg_hash_similarity: Number(s.avg_hash_similarity ?? 0) || 0,
      avg_semantic_score: Number(s.avg_semantic_score ?? 0) || 0,
      avg_cost_diff: Number(s.avg_cost_diff ?? 0) || 0,
      avg_latency_diff: Number(s.avg_latency_diff ?? 0) || 0,
      response_changes: Number(s.response_changes ?? 0) || 0,
    } as {
      total_results: number;
      avg_hash_similarity: number;
      avg_semantic_score: number;
      avg_cost_diff: number;
      avg_latency_diff: number;
      response_changes: number;
    };
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Replay Studio</h1>
            <p className="text-muted-foreground">
              Re-run traces with different models and configurations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
          <Card className="p-6 border-border">
            <TableSkeleton rows={5} columns={6} />
          </Card>
        </div>
      </div>
    );
  }

  const completedSets = replaySets.filter((s) => s.status === 'completed').length;
  const totalTraces = replaySets.reduce(
    (sum, s) => sum + (parseInt(String(s.total_traces)) || 0),
    0
  );
  const normalizedSummary = normalizeSummary(replaySummary);

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Replay Studio</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Optimize prompts and models through experiment replay
            </p>
          </div>
          <Button
            onClick={() => setCreateDrawerOpen(true)}
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-tight">
              Create Replay Set
            </span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="p-4 border-border bg-card shadow-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Total Replay Sets
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-mono font-bold tracking-tighter text-foreground">
                    {replaySets.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 font-medium">
                    {completedSets} completed
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-primary/10 p-2 group-hover:scale-110 transition-transform duration-300">
                <GitCompare className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${replaySets.length > 0 ? (completedSets / replaySets.length) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card shadow-sm overflow-hidden group hover:border-accent transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Total Traces
                </p>
                <p className="text-2xl font-mono font-bold tracking-tighter text-foreground">
                  {totalTraces}
                </p>
                <p className="text-[10px] text-green-600 dark:text-green-500 font-bold uppercase tracking-tight">
                  Active Coverage
                </p>
              </div>
              <div className="rounded-md bg-accent p-2 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card shadow-sm overflow-hidden group hover:border-green-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Avg Cost Savings
                </p>
                <p className="text-2xl font-mono font-bold tracking-tighter text-foreground">N/A</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-medium">
                  <TrendingDown className="h-3 w-3" />
                  <span>{completedSets > 0 ? 'Analyzing patterns...' : 'No data yet'}</span>
                </div>
              </div>
              <div className="rounded-md bg-primary/10 p-2 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Replay Sets List */}
        <Card className="p-6 border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Saved Replay Sets</h3>
              <p className="text-sm text-muted-foreground">
                Manage and execute your replay experiments
              </p>
            </div>

            <div className="relative w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10 transition-colors">
                  <tr>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Name
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Traces
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Created
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Last Run
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-left">
                      Status
                    </th>
                    <th className="h-9 px-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {replaySets.map((set) => (
                    <tr
                      key={set.replay_id}
                      className="cursor-pointer hover:bg-accent/40 transition-colors border-b border-border/50 h-10 group"
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground line-clamp-1">
                            {set.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 font-medium line-clamp-1">
                            {set.description || 'No description'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[9px] font-mono bg-accent text-muted-foreground border-none"
                        >
                          {set.total_traces} traces
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono tracking-tighter">
                        {formatDateISO(set.created_at).split(' ')[0]}
                      </td>
                      <td className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono tracking-tighter">
                        {set.completed_traces && set.completed_traces > 0
                          ? formatDateISO(set.created_at).split(' ')[0]
                          : 'Never'}
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-1 text-[9px] font-bold uppercase',
                            set.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : set.status === 'running'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-muted text-muted-foreground border-border/50'
                          )}
                        >
                          {set.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedSet(set);
                              setRunDrawerOpen(true);
                            }}
                            disabled={set.status === 'running'}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </Button>
                          {set.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] font-bold uppercase text-muted-foreground hover:bg-accent"
                              onClick={() => handleViewResults(set)}
                            >
                              Results
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReplaySet(set.replay_id);
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {replaySets.length > 0 && totalReplaySets > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalReplaySets)} of {totalReplaySets}{' '}
                    replay sets
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    totalItems={totalReplaySets}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Create Replay Set Drawer */}
        <Drawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
          <DrawerContent className="focus:outline-none border-border">
            <div className="mx-auto w-full h-full overflow-y-auto">
              <div className="space-y-6 p-6 pb-12">
                <DrawerHeader className="p-0">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Create Replay Set</DrawerTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCreateDrawerOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DrawerDescription>
                    Select traces to include in your replay experiment
                  </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="replay-name" className="text-sm font-medium">
                        Replay Set Name
                      </label>
                      <Input
                        id="replay-name"
                        placeholder="e.g., GPT-4 vs Claude Comparison"
                        value={replayName}
                        onChange={(e) => setReplayName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="replay-description" className="text-sm font-medium">
                        Description
                      </label>
                      <Textarea
                        id="replay-description"
                        placeholder="Describe the purpose of this replay set..."
                        value={replayDescription}
                        onChange={(e) => setReplayDescription(e.target.value)}
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Trace Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                      Select Traces ({selectedTraces.length} selected)
                    </label>
                    <div className="mt-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {availableTraces.length > 0 ? (
                        availableTraces.map((trace) => (
                          <div
                            key={trace.trace_id}
                            onClick={() => handleToggleTrace(trace.trace_id)}
                            className={cn(
                              'flex items-center justify-between p-2 rounded border transition-all cursor-pointer group',
                              selectedTraces.includes(trace.trace_id)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-accent-foreground/20'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[11px] text-foreground truncate">
                                {trace.endpoint}
                              </p>
                              <p className="text-[9px] text-muted-foreground/60 font-medium truncate max-w-xs">
                                {trace.prompt || 'No prompt content'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="h-3.5 px-1 text-[8px] font-mono bg-accent text-muted-foreground border-none"
                              >
                                {trace.model}
                              </Badge>
                              <div
                                className={cn(
                                  'h-3.5 w-3.5 rounded border transition-colors flex items-center justify-center',
                                  selectedTraces.includes(trace.trace_id)
                                    ? 'border-primary bg-primary'
                                    : 'border-border group-hover:border-primary/50'
                                )}
                              >
                                {selectedTraces.includes(trace.trace_id) && (
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                            No traces available
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setCreateDrawerOpen(false)}
                      className="flex-1 h-8 text-[11px] font-bold uppercase"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateReplaySet}
                      disabled={selectedTraces.length === 0 || !replayName || isCreating}
                      className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase shadow-sm"
                    >
                      {isCreating ? 'Creating...' : 'Create Set'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Run Replay Drawer */}
        <Drawer open={runDrawerOpen} onOpenChange={setRunDrawerOpen}>
          <DrawerContent className="focus:outline-none border-border">
            <div className="mx-auto w-full h-full overflow-y-auto">
              <div className="space-y-6 p-6 pb-12">
                <DrawerHeader className="p-0">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>Run Replay</DrawerTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setRunDrawerOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DrawerDescription>
                    Configure model parameters and run your replay experiment
                  </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-4">
                  {/* Model Selection */}
                  <div>
                    <label
                      htmlFor="model"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1"
                    >
                      Target AI Model
                    </label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="model" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between ml-1">
                      <label
                        htmlFor="temperature"
                        className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter"
                      >
                        Temperature
                      </label>
                      <span className="text-[10px] font-mono font-bold text-primary">
                        {temperature}
                      </span>
                    </div>
                    <Input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="mt-1 h-1.5 bg-muted accent-primary"
                    />
                    <p className="text-[9px] text-muted-foreground/60 font-medium mt-1 uppercase tracking-tight">
                      Lower is deterministic, higher is creative
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label
                      htmlFor="max-tokens"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1"
                    >
                      Max Completion Tokens
                    </label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      className="mt-1 h-8 text-[11px] font-mono border-border focus:border-primary"
                      min="1"
                      max="4000"
                    />
                  </div>

                  {/* Prompt Template */}
                  <div>
                    <label
                      htmlFor="prompt-template"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter ml-1"
                    >
                      Prompt Template Override
                    </label>
                    <Textarea
                      id="prompt-template"
                      placeholder="Use {ORIGINAL_PROMPT} to transform existing data..."
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      className="mt-1 font-mono text-[10px] border-border focus:border-primary bg-muted/20"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={() => setRunDrawerOpen(false)}
                      className="flex-1 h-8 text-[11px] font-bold uppercase"
                      disabled={isRunning}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRunReplay}
                      className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold uppercase gap-2 shadow-sm"
                      disabled={isRunning}
                    >
                      <Play className="h-3 w-3" />
                      {isRunning ? 'Executing...' : 'Run Experiment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Results Drawer */}
        <Drawer open={resultsDrawerOpen} onOpenChange={setResultsDrawerOpen}>
          <DrawerContent className="focus:outline-none border-border">
            <div className="mx-auto w-full h-full overflow-y-auto">
              <div className="space-y-6 p-6 pb-12">
                <DrawerHeader className="shrink-0 border-b border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <DrawerTitle className="text-base font-bold text-foreground tracking-tight">
                        Replay Results
                      </DrawerTitle>
                      {selectedSet && (
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-accent text-muted-foreground border-none"
                        >
                          {selectedSet.name}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setResultsDrawerOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                    <span>Performance Comparison</span>
                    {normalizedSummary && (
                      <>
                        <span>•</span>
                        <span className="text-primary">{`${normalizedSummary.avg_semantic_score.toFixed(1)}% Avg Similarity`}</span>
                      </>
                    )}
                  </div>
                </DrawerHeader>

                {isLoadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading replay results...</p>
                    </div>
                  </div>
                ) : replaySummary && replayResults.length > 0 ? (
                  <>
                    {/* Summary Metrics - Premium Sticky Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                      <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1 group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                            Avg Cost Diff
                          </p>
                          <TrendingDown
                            className={cn(
                              'h-3 w-3',
                              normalizedSummary && normalizedSummary.avg_cost_diff < 0
                                ? 'text-emerald-500'
                                : 'text-destructive'
                            )}
                          />
                        </div>
                        <p
                          className={cn(
                            'text-lg font-mono font-bold tracking-tighter',
                            normalizedSummary && normalizedSummary.avg_cost_diff < 0
                              ? 'text-emerald-500'
                              : 'text-destructive'
                          )}
                        >
                          {normalizedSummary && normalizedSummary.avg_cost_diff > 0 ? '+' : ''}
                          {normalizedSummary
                            ? `${(normalizedSummary.avg_cost_diff * 100).toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>

                      <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1 group hover:border-accent/30 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                            Latency Delta
                          </p>
                          <Clock className="h-3 w-3 text-accent" />
                        </div>
                        <p
                          className={cn(
                            'text-lg font-mono font-bold tracking-tighter',
                            normalizedSummary && normalizedSummary.avg_latency_diff < 0
                              ? 'text-emerald-500'
                              : 'text-destructive'
                          )}
                        >
                          {normalizedSummary && normalizedSummary.avg_latency_diff > 0 ? '+' : ''}
                          {normalizedSummary
                            ? `${(normalizedSummary.avg_latency_diff * 100).toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>

                      <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1 group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                            Similarity
                          </p>
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-lg font-mono font-bold tracking-tighter text-foreground">
                          {normalizedSummary
                            ? `${normalizedSummary.avg_semantic_score.toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>

                      <div className="rounded border border-border/50 bg-muted/20 p-2.5 space-y-1 group hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                            Deviations
                          </p>
                          <GitCompare className="h-3 w-3 text-orange-500" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-lg font-mono font-bold tracking-tighter text-foreground">
                            {normalizedSummary ? normalizedSummary.response_changes : 0}
                          </p>
                          <span className="text-[9px] text-muted-foreground/60 font-medium">
                            {normalizedSummary && normalizedSummary.total_results > 0
                              ? `${((normalizedSummary.response_changes / normalizedSummary.total_results) * 100).toFixed(1)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Results List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">
                          Experiment Results Breakdown ({replayResults.length})
                        </h3>
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px] font-bold uppercase bg-accent text-muted-foreground border-none"
                        >
                          Virtual List Mode
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                        {replayResults.map((result) => (
                          <Card
                            key={result.result_id}
                            className="p-4 border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all"
                          >
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold tracking-tight text-foreground">
                                      {result.service_name || 'System'}
                                    </h4>
                                    <span className="text-xs text-muted-foreground font-mono font-medium">
                                      / {result.endpoint}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                        Cost
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-foreground">
                                        ${result.original_cost.toFixed(4)} → $
                                        {result.replay_cost.toFixed(4)}
                                        <span
                                          className={cn(
                                            'ml-1.5',
                                            result.diff_summary.cost_diff_percent < 0
                                              ? 'text-emerald-500'
                                              : 'text-destructive'
                                          )}
                                        >
                                          ({result.diff_summary.cost_diff_percent > 0 ? '+' : ''}
                                          {result.diff_summary.cost_diff_percent.toFixed(1)}%)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                        Latency
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-foreground">
                                        {result.original_latency.toFixed(0)}ms →{' '}
                                        {result.replay_latency.toFixed(0)}ms
                                        <span
                                          className={cn(
                                            'ml-1.5',
                                            result.diff_summary.latency_diff_percent < 0
                                              ? 'text-emerald-500'
                                              : 'text-destructive'
                                          )}
                                        >
                                          ({result.diff_summary.latency_diff_percent > 0 ? '+' : ''}
                                          {result.diff_summary.latency_diff_percent.toFixed(1)}%)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'h-4 px-1.5 text-[8px] font-bold uppercase tracking-widest border-none',
                                      result.diff_summary.response_changed
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-emerald-500/10 text-emerald-500'
                                    )}
                                  >
                                    {result.diff_summary.response_changed ? 'Modified' : 'Stable'}
                                  </Badge>
                                  <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-foreground">
                                      {result.semantic_score.toFixed(1)}%
                                    </div>
                                    <div className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                      Similarity
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* IO Comparison */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                                    <Database className="h-3 w-3" />
                                    <span>Original Response</span>
                                  </div>
                                  <pre className="p-2.5 rounded border border-border/50 bg-muted/20 text-[10px] font-mono text-muted-foreground/80 overflow-auto max-h-[120px] custom-scrollbar leading-relaxed">
                                    {result.original_response}
                                  </pre>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary/70 uppercase tracking-tight">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Replayed Response</span>
                                  </div>
                                  <pre className="p-2.5 rounded border border-primary/20 bg-primary/5 text-[10px] font-mono text-foreground/90 overflow-auto max-h-[120px] custom-scrollbar leading-relaxed">
                                    {result.replay_response}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed border-border">
                    <div className="text-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <FileText className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">No results available</p>
                        <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-tight">
                          Run a replay execution to generate metrics
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
