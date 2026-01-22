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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ArrowRight,
  FileText,
  Check,
  Trash2,
} from 'lucide-react';
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
          <Card className="p-6 border-(--accent)">
            <TableSkeleton rows={5} columns={6} />
          </Card>
        </div>
      </div>
    );
  }

  const completedSets = replaySets.filter((s) => s.status === 'completed').length;
  const totalTraces = replaySets.reduce((sum, s) => sum + s.total_traces, 0);
  const normalizedSummary = normalizeSummary(replaySummary);

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Replay Studio</h1>
            <p className="text-muted-foreground">
              Re-run traces with different models and configurations
            </p>
          </div>
          <Button onClick={() => setCreateDrawerOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Replay Set
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Replay Sets</p>
                <p className="text-3xl font-bold">{replaySets.length}</p>
                <p className="text-sm text-muted-foreground">{completedSets} completed</p>
              </div>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-3">
                <GitCompare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Traces</p>
                <p className="text-3xl font-bold">{totalTraces}</p>
                <p className="text-sm text-green-600 dark:text-green-500">Across all sets</p>
              </div>
              <div className="rounded-lg bg-purple-100 dark:bg-purple-950 p-3">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-(--accent)">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Cost Savings</p>
                <p className="text-3xl font-bold">N/A</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    {completedSets > 0 ? 'Run replays to see data' : 'No completed replays'}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-green-100 dark:bg-green-950 p-3">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Replay Sets List */}
        <Card className="p-6 border-(--accent)">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Saved Replay Sets</h3>
              <p className="text-sm text-muted-foreground">
                Manage and execute your replay experiments
              </p>
            </div>

            <div className="relative w-full overflow-x-auto rounded-lg border border-(--border)">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Traces</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replaySets.map((set) => (
                    <TableRow
                      key={set.replay_id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-(--accent)"
                    >
                      <TableCell className="font-medium">{set.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-80 truncate">
                        {set.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{set.total_traces} traces</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateISO(set.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {set.completed_traces && set.completed_traces > 0
                          ? formatDateISO(set.created_at)
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={set.status === 'completed' ? 'success' : 'secondary'}>
                          {set.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSet(set);
                              setRunDrawerOpen(true);
                            }}
                            disabled={set.status === 'running'}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {set.status === 'running' ? 'Running...' : 'Run Replay'}
                          </Button>
                          {set.status === 'completed' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewResults(set)}
                            >
                              View Results
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReplaySet(set.replay_id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>

              {/* Pagination */}
              {replaySets.length > 0 && totalReplaySets > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-(--border )bg-background">
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
          <DrawerContent className="focus:outline-none border-(--border)">
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
                    <label className="text-sm font-medium">
                      Select Traces ({selectedTraces.length} selected)
                    </label>
                    <div className="mt-2 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {availableTraces.length > 0 ? (
                        availableTraces.map((trace) => (
                          <div
                            key={trace.trace_id}
                            onClick={() => handleToggleTrace(trace.trace_id)}
                            className={`flex items-center justify-between p-3 rounded-lg border border-(--accent) cursor-pointer transition-colors ${
                              selectedTraces.includes(trace.trace_id)
                                ? 'border-primary bg-primary/5'
                                : 'border-(--border) hover:border-primary/50'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{trace.endpoint}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-md">
                                {trace.prompt || 'No prompt available'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-xs">
                                {trace.model}
                              </Badge>
                              <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                  selectedTraces.includes(trace.trace_id)
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground'
                                }`}
                              >
                                {selectedTraces.includes(trace.trace_id) && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No traces available. Create some traces first.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setCreateDrawerOpen(false)}
                      className="flex-1"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateReplaySet}
                      disabled={selectedTraces.length === 0 || !replayName || isCreating}
                      className="flex-1"
                    >
                      {isCreating ? 'Creating...' : 'Create Replay Set'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Run Replay Drawer */}
        <Drawer open={runDrawerOpen} onOpenChange={setRunDrawerOpen}>
          <DrawerContent className="focus:outline-none border-(--border)">
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

                <div className="space-y-6">
                  {/* Model Selection */}
                  <div>
                    <label htmlFor="model" className="text-sm font-medium">
                      Model
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
                    <div className="flex items-center justify-between">
                      <label htmlFor="temperature" className="text-sm font-medium">
                        Temperature
                      </label>
                      <span className="text-sm text-muted-foreground">{temperature}</span>
                    </div>
                    <Input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lower is more focused, higher is more creative
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label htmlFor="max-tokens" className="text-sm font-medium">
                      Max Tokens
                    </label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      className="mt-1.5"
                      min="1"
                      max="4000"
                    />
                  </div>

                  {/* Prompt Template */}
                  <div>
                    <label htmlFor="prompt-template" className="text-sm font-medium">
                      Prompt Template (Optional)
                    </label>
                    <Textarea
                      id="prompt-template"
                      placeholder="Leave empty to use original prompts, or provide a template with {ORIGINAL_PROMPT} placeholder..."
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      className="mt-1.5 font-mono text-sm"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {'{ORIGINAL_PROMPT}'} to inject the original prompt
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-(--border)">
                    <Button
                      variant="secondary"
                      onClick={() => setRunDrawerOpen(false)}
                      className="flex-1"
                      disabled={isRunning}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRunReplay} className="flex-1 gap-2" disabled={isRunning}>
                      <Play className="h-4 w-4" />
                      {isRunning ? 'Running...' : 'Run Replay'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Results Drawer */}
        <Drawer open={resultsDrawerOpen} onOpenChange={setResultsDrawerOpen}>
          <DrawerContent className="focus:outline-none border-(--border)">
            <div className="mx-auto w-full h-full overflow-y-auto">
              <div className="space-y-6 p-6 pb-12">
                <DrawerHeader className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DrawerTitle>Replay Results</DrawerTitle>
                      {selectedSet && <Badge variant="secondary">{selectedSet.name}</Badge>}
                      {normalizedSummary && (
                        <Badge variant="success" className="gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          {`${normalizedSummary.avg_semantic_score.toFixed(1)}% Avg Similarity`}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setResultsDrawerOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DrawerDescription>Compare original and replayed trace outputs</DrawerDescription>
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
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-4 border-(--accent)">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Avg Cost Diff</p>
                            <p
                              className={`text-2xl font-bold ${normalizedSummary && normalizedSummary.avg_cost_diff < 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                            >
                              {normalizedSummary && normalizedSummary.avg_cost_diff > 0 ? '+' : ''}
                              {normalizedSummary
                                ? `${(normalizedSummary.avg_cost_diff * 100).toFixed(1)}%`
                                : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {normalizedSummary
                                ? `${normalizedSummary.total_results} traces`
                                : '0 traces'}
                            </p>
                          </div>
                          <TrendingDown
                            className={`h-8 w-8 ${replaySummary.avg_cost_diff < 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                          />
                        </div>
                      </Card>

                      <Card className="p-4 border-(--accent)">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Avg Latency Diff</p>
                            <p
                              className={`text-2xl font-bold ${normalizedSummary && normalizedSummary.avg_latency_diff < 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                            >
                              {normalizedSummary && normalizedSummary.avg_latency_diff > 0
                                ? '+'
                                : ''}
                              {normalizedSummary
                                ? `${(normalizedSummary.avg_latency_diff * 100).toFixed(1)}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                      </Card>

                      <Card className="p-4 border-(--accent)">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Semantic Score</p>
                            <p className="text-2xl font-bold">
                              {normalizedSummary
                                ? `${normalizedSummary.avg_semantic_score.toFixed(1)}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </Card>

                      <Card className="p-4 border-(--accent)">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Response Changes</p>
                            <p className="text-2xl font-bold">
                              {normalizedSummary ? normalizedSummary.response_changes : 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {normalizedSummary && normalizedSummary.total_results > 0
                                ? `${((normalizedSummary.response_changes / normalizedSummary.total_results) * 100).toFixed(1)}% changed`
                                : '0.0% changed'}
                            </p>
                          </div>
                          <GitCompare className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                        </div>
                      </Card>
                    </div>

                    {/* Results List */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Individual Results ({replayResults.length})
                      </h3>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {replayResults.map((result) => (
                          <Card key={result.result_id} className="p-4 border-(--accent)">
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">
                                    {result.service_name || 'Unknown Service'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {result.endpoint || 'Unknown Endpoint'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      result.diff_summary.response_changed ? 'warning' : 'success'
                                    }
                                  >
                                    {result.diff_summary.response_changed ? 'Changed' : 'Unchanged'}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {result.semantic_score.toFixed(1)}% similar
                                  </Badge>
                                </div>
                              </div>

                              {/* Metrics */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Cost</p>
                                  <p className="font-medium">
                                    ${result.original_cost.toFixed(4)} → $
                                    {result.replay_cost.toFixed(4)}
                                    <span
                                      className={`ml-2 ${result.diff_summary.cost_diff_percent < 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                                    >
                                      ({result.diff_summary.cost_diff_percent > 0 ? '+' : ''}
                                      {result.diff_summary.cost_diff_percent.toFixed(1)}%)
                                    </span>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Latency</p>
                                  <p className="font-medium">
                                    {result.original_latency.toFixed(0)}ms →{' '}
                                    {result.replay_latency.toFixed(0)}ms
                                    <span
                                      className={`ml-2 ${result.diff_summary.latency_diff_percent < 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                                    >
                                      ({result.diff_summary.latency_diff_percent > 0 ? '+' : ''}
                                      {result.diff_summary.latency_diff_percent.toFixed(1)}%)
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {/* Prompt Display */}
                              {(result.prompt || result.replay_prompt) && (
                                <div className="border-t border-(--border) pt-4">
                                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                                    {result.replay_prompt ? 'Prompts' : 'Prompt'}
                                  </p>
                                  {result.replay_prompt ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {/* Original Prompt */}
                                      <div className="rounded-lg border border-(--border) bg-muted/30 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-(--border) bg-muted/50">
                                          <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <span className="text-xs font-medium">
                                              Original Prompt
                                            </span>
                                          </div>
                                        </div>
                                        <div className="p-3 max-h-32 overflow-auto custom-scrollbar">
                                          <p className="text-xs font-mono whitespace-pre-wrap">
                                            {result.prompt || 'No original prompt'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Replay Prompt */}
                                      <div className="rounded-lg border border-(--border) bg-muted/30 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-(--border) bg-muted/50">
                                          <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs font-medium">
                                              Replay Prompt
                                            </span>
                                          </div>
                                        </div>
                                        <div className="p-3 max-h-32 overflow-auto custom-scrollbar">
                                          <p className="text-xs font-mono whitespace-pre-wrap">
                                            {result.replay_prompt}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg bg-muted/50 p-3 max-h-24 overflow-auto custom-scrollbar">
                                      <p className="text-xs font-mono whitespace-pre-wrap">
                                        {result.prompt}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Responses Comparison */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Original */}
                                <div className="rounded-lg border border-(--border) bg-muted/30 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-(--border) bg-muted/50">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                      <span className="text-xs font-medium">Original</span>
                                    </div>
                                  </div>
                                  <div className="p-3 max-h-48 overflow-auto custom-scrollbar">
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                      {result.original_response}
                                    </p>
                                  </div>
                                </div>

                                {/* Replay */}
                                <div className="rounded-lg border border-(--border) bg-muted/30 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-(--border) bg-muted/50">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                      <span className="text-xs font-medium">Replayed</span>
                                    </div>
                                  </div>
                                  <div className="p-3 max-h-48 overflow-auto custom-scrollbar">
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                      {result.replay_response}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">No replay results available</p>
                      <p className="text-xs text-muted-foreground">Run a replay to see results</p>
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
