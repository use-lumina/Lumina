'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { KPICardSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';
import {
  Play,
  Plus,
  GitCompare,
  Clock,
  DollarSign,
  Hash,
  TrendingDown,
  Copy,
  Check,
  X,
  Sparkles,
  ArrowRight,
  FileText,
} from 'lucide-react';

// Mock data for replay sets
const mockReplaySets = [
  {
    id: 'replay-1',
    name: 'Customer Support Optimization',
    description: 'Testing GPT-4 vs Claude for support responses',
    traceCount: 12,
    createdAt: '2025-12-15T10:30:00Z',
    lastRun: '2025-12-17T14:20:00Z',
    status: 'completed' as const,
  },
  {
    id: 'replay-2',
    name: 'Cost Reduction Experiment',
    description: 'Compare GPT-4 with GPT-3.5 Turbo for summaries',
    traceCount: 25,
    createdAt: '2025-12-10T09:15:00Z',
    lastRun: '2025-12-16T11:45:00Z',
    status: 'completed' as const,
  },
  {
    id: 'replay-3',
    name: 'Temperature Testing',
    description: 'Optimal temperature for creative writing tasks',
    traceCount: 8,
    createdAt: '2025-12-18T08:00:00Z',
    lastRun: null,
    status: 'draft' as const,
  },
];

// Mock traces for selection
const mockTraces = [
  { id: 'tr_01', endpoint: '/chat/message', prompt: 'Explain quantum computing', model: 'gpt-4' },
  {
    id: 'tr_02',
    endpoint: '/chat/message',
    prompt: 'Write a product description',
    model: 'claude-3',
  },
  { id: 'tr_03', endpoint: '/summarize', prompt: 'Summarize this article...', model: 'gpt-4' },
  { id: 'tr_04', endpoint: '/chat/message', prompt: 'Debug this code...', model: 'claude-3' },
  { id: 'tr_05', endpoint: '/translate', prompt: 'Translate to Spanish...', model: 'gpt-3.5' },
];

// Mock replay results
const mockReplayResult = {
  original: {
    model: 'gpt-4',
    temperature: 0.7,
    output:
      'Quantum computing is a revolutionary approach to computation that harnesses the unique properties of quantum mechanics. Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or "qubits" which can exist in multiple states simultaneously through a phenomenon called superposition.',
    cost: 0.045,
    tokensIn: 42,
    tokensOut: 156,
    latency: 2150,
  },
  new: {
    model: 'claude-3',
    temperature: 0.5,
    output:
      'Quantum computing represents a fundamental shift in how we process information. While traditional computers use binary bits that are either 0 or 1, quantum computers leverage quantum bits (qubits) that can exist in multiple states at once due to superposition, enabling parallel processing of vast amounts of data.',
    cost: 0.028,
    tokensIn: 42,
    tokensOut: 148,
    latency: 1890,
  },
  similarity: 94.5,
};

export default function ReplayPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [runDrawerOpen, setRunDrawerOpen] = useState(false);
  const [resultsDrawerOpen, setResultsDrawerOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);

  // Replay configuration
  const [replayName, setReplayName] = useState('');
  const [replayDescription, setReplayDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('500');
  const [promptTemplate, setPromptTemplate] = useState('');

  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleTrace = (traceId: string) => {
    setSelectedTraces((prev) =>
      prev.includes(traceId) ? prev.filter((id) => id !== traceId) : [...prev, traceId]
    );
  };

  const handleCreateReplaySet = () => {
    // Create replay set logic
    setCreateDrawerOpen(false);
    setSelectedTraces([]);
    setReplayName('');
    setReplayDescription('');
  };

  const handleRunReplay = () => {
    // Run replay logic
    setRunDrawerOpen(false);
    setTimeout(() => {
      setResultsDrawerOpen(true);
    }, 500);
  };

  const copyToClipboard = async (text: string, type: 'original' | 'new') => {
    await navigator.clipboard.writeText(text);
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedNew(true);
      setTimeout(() => setCopiedNew(false), 2000);
    }
  };

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

  const completedSets = mockReplaySets.filter((s) => s.status === 'completed').length;
  const totalTraces = mockReplaySets.reduce((sum, s) => sum + s.traceCount, 0);

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
                <p className="text-3xl font-bold">{mockReplaySets.length}</p>
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
                <p className="text-3xl font-bold">37.8%</p>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <TrendingDown className="h-4 w-4" />
                  <span>From optimization</span>
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

            <div className="rounded-lg border-(--border) border border-border overflow-auto max-h-[600px] custom-scrollbar">
              <Table>
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
                  {mockReplaySets.map((set) => (
                    <TableRow
                      key={set.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-(--accent)"
                    >
                      <TableCell className="font-medium">{set.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-80 truncate">
                        {set.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{set.traceCount} traces</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(set.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {set.lastRun ? new Date(set.lastRun).toLocaleDateString() : 'Never'}
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
                              setSelectedSet(set.id);
                              setRunDrawerOpen(true);
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run Replay
                          </Button>
                          {set.status === 'completed' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setResultsDrawerOpen(true)}
                            >
                              View Results
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                      <Label htmlFor="replay-name">Replay Set Name</Label>
                      <Input
                        id="replay-name"
                        placeholder="e.g., GPT-4 vs Claude Comparison"
                        value={replayName}
                        onChange={(e) => setReplayName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="replay-description">Description</Label>
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
                    <Label>Select Traces ({selectedTraces.length} selected)</Label>
                    <div className="mt-2 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {mockTraces.map((trace) => (
                        <div
                          key={trace.id}
                          onClick={() => handleToggleTrace(trace.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border border-(--accent) cursor-pointer transition-colors ${
                            selectedTraces.includes(trace.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{trace.endpoint}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-md">
                              {trace.prompt}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs">
                              {trace.model}
                            </Badge>
                            <div
                              className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                selectedTraces.includes(trace.id)
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground'
                              }`}
                            >
                              {selectedTraces.includes(trace.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setCreateDrawerOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateReplaySet}
                      disabled={selectedTraces.length === 0 || !replayName}
                      className="flex-1"
                    >
                      Create Replay Set
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
                    <Label htmlFor="model">Model</Label>
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
                      <Label htmlFor="temperature">Temperature</Label>
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
                    <Label htmlFor="max-tokens">Max Tokens</Label>
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
                    <Label htmlFor="prompt-template">Prompt Template (Optional)</Label>
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

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      variant="secondary"
                      onClick={() => setRunDrawerOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRunReplay} className="flex-1 gap-2">
                      <Play className="h-4 w-4" />
                      Run Replay
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
                      <Badge variant="success" className="gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        {mockReplayResult.similarity}% Similar
                      </Badge>
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

                {/* Comparison Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border-(--accent)">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Cost Savings</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                          -37.8%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${mockReplayResult.original.cost.toFixed(3)} → $
                          {mockReplayResult.new.cost.toFixed(3)}
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-green-600 dark:text-green-500" />
                    </div>
                  </Card>

                  <Card className="p-4 border-(--accent)">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Token Usage</p>
                        <p className="text-2xl font-bold">{mockReplayResult.new.tokensOut}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mockReplayResult.original.tokensOut} → {mockReplayResult.new.tokensOut}
                        </p>
                      </div>
                      <Hash className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </Card>

                  <Card className="p-4 border-(--accent)">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Latency</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                          -12.1%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mockReplayResult.original.latency}ms → {mockReplayResult.new.latency}ms
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                  </Card>
                </div>

                {/* Side-by-Side Diff */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Output Comparison</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Original Output */}
                    <div className="rounded-lg border-(--border) border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-(--accent) border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium">Original</span>
                          <Badge variant="secondary" className="text-xs">
                            {mockReplayResult.original.model}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() =>
                            copyToClipboard(mockReplayResult.original.output, 'original')
                          }
                        >
                          {copiedOriginal ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-xs text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-xs">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-4 bg-muted/50 max-h-96 overflow-auto custom-scrollbar">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {mockReplayResult.original.output}
                        </p>
                      </div>
                      <div className="px-4 py-3 border-t border-(--accent) border-border bg-background">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {mockReplayResult.original.tokensIn} in /{' '}
                            {mockReplayResult.original.tokensOut} out
                          </span>
                          <span>${mockReplayResult.original.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>

                    {/* New Output */}
                    <div className="rounded-lg border border-(--border)  border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-(--accent) border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">Replayed</span>
                          <Badge variant="secondary" className="text-xs">
                            {mockReplayResult.new.model}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => copyToClipboard(mockReplayResult.new.output, 'new')}
                        >
                          {copiedNew ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-xs text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-xs">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-4 bg-muted/50 max-h-96 overflow-auto custom-scrollbar">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {mockReplayResult.new.output}
                        </p>
                      </div>
                      <div className="px-4 py-3 border-t border-(--accent) border-border bg-background">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {mockReplayResult.new.tokensIn} in / {mockReplayResult.new.tokensOut}{' '}
                            out
                          </span>
                          <span className="text-green-600 dark:text-green-500">
                            ${mockReplayResult.new.cost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
