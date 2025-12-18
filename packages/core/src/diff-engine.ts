/**
 * Lumina Diff Engine
 * Provides reusable comparison logic for replay testing
 */

import { textSimilarity } from './hash';

export interface TraceData {
  response: string;
  cost: number;
  latency: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface DiffResult {
  hashSimilarity: number;
  semanticScore: number;
  costDelta: {
    absolute: number;
    percent: number;
  };
  latencyDelta: {
    absolute: number;
    percent: number;
  };
  tokenDelta?: {
    promptTokens: {
      absolute: number;
      percent: number;
    };
    completionTokens: {
      absolute: number;
      percent: number;
    };
  };
  responseChanged: boolean;
  summary: DiffSummary;
}

export interface DiffSummary {
  cost_diff: number;
  cost_diff_percent: number;
  latency_diff: number;
  latency_diff_percent: number;
  response_changed: boolean;
  prompt_tokens_diff?: number;
  completion_tokens_diff?: number;
}

export interface SideBySideComparison {
  original: TraceData;
  replay: TraceData;
  diff: DiffResult;
}

/**
 * Calculate semantic similarity score (placeholder for MVP)
 * In production, this would use embedding-based comparison
 */
export function calculateSemanticScore(original: string, replay: string): number {
  // For MVP, use text similarity from hash module
  // In production, this would:
  // 1. Generate embeddings for both responses
  // 2. Calculate cosine similarity
  // 3. Return similarity score

  const similarity = textSimilarity(original, replay);

  // Add some variation to simulate semantic scoring
  // Semantic scores are typically slightly higher than exact text matches
  if (similarity === 1.0) return 0.98; // Exact match but semantic context matters
  if (similarity > 0.95) return similarity - 0.02; // Very similar
  return similarity * 0.9; // Lower confidence for different responses
}

/**
 * Calculate cost delta between original and replay
 */
export function calculateCostDelta(originalCost: number, replayCost: number) {
  const absolute = replayCost - originalCost;
  const percent = originalCost > 0 ? (absolute / originalCost) * 100 : 0;

  return {
    absolute,
    percent,
  };
}

/**
 * Calculate latency delta between original and replay
 */
export function calculateLatencyDelta(originalLatency: number, replayLatency: number) {
  const absolute = replayLatency - originalLatency;
  const percent = originalLatency > 0 ? (absolute / originalLatency) * 100 : 0;

  return {
    absolute,
    percent,
  };
}

/**
 * Calculate token usage delta
 */
export function calculateTokenDelta(
  originalPromptTokens: number,
  originalCompletionTokens: number,
  replayPromptTokens: number,
  replayCompletionTokens: number
) {
  const promptAbsolute = replayPromptTokens - originalPromptTokens;
  const promptPercent =
    originalPromptTokens > 0 ? (promptAbsolute / originalPromptTokens) * 100 : 0;

  const completionAbsolute = replayCompletionTokens - originalCompletionTokens;
  const completionPercent =
    originalCompletionTokens > 0 ? (completionAbsolute / originalCompletionTokens) * 100 : 0;

  return {
    promptTokens: {
      absolute: promptAbsolute,
      percent: promptPercent,
    },
    completionTokens: {
      absolute: completionAbsolute,
      percent: completionPercent,
    },
  };
}

/**
 * Create a comprehensive diff summary
 */
export function createDiffSummary(
  original: TraceData,
  replay: TraceData,
  hashSimilarity: number
): DiffSummary {
  const costDelta = calculateCostDelta(original.cost, replay.cost);
  const latencyDelta = calculateLatencyDelta(original.latency, replay.latency);

  const summary: DiffSummary = {
    cost_diff: costDelta.absolute,
    cost_diff_percent: costDelta.percent,
    latency_diff: latencyDelta.absolute,
    latency_diff_percent: latencyDelta.percent,
    response_changed: hashSimilarity < 1.0,
  };

  // Add token deltas if available
  if (
    original.promptTokens !== undefined &&
    original.completionTokens !== undefined &&
    replay.promptTokens !== undefined &&
    replay.completionTokens !== undefined
  ) {
    summary.prompt_tokens_diff = replay.promptTokens - original.promptTokens;
    summary.completion_tokens_diff = replay.completionTokens - original.completionTokens;
  }

  return summary;
}

/**
 * Perform a complete comparison between original and replay traces
 */
export function compareTraces(original: TraceData, replay: TraceData): DiffResult {
  // Calculate similarities using text similarity from hash module
  const hashSimilarity = textSimilarity(original.response, replay.response);
  const semanticScore = calculateSemanticScore(original.response, replay.response);

  // Calculate deltas
  const costDelta = calculateCostDelta(original.cost, replay.cost);
  const latencyDelta = calculateLatencyDelta(original.latency, replay.latency);

  // Calculate token delta if available
  const tokenDelta =
    original.promptTokens !== undefined &&
    original.completionTokens !== undefined &&
    replay.promptTokens !== undefined &&
    replay.completionTokens !== undefined
      ? calculateTokenDelta(
          original.promptTokens,
          original.completionTokens,
          replay.promptTokens,
          replay.completionTokens
        )
      : undefined;

  // Create summary
  const summary = createDiffSummary(original, replay, hashSimilarity);

  return {
    hashSimilarity,
    semanticScore,
    costDelta,
    latencyDelta,
    tokenDelta,
    responseChanged: hashSimilarity < 1.0,
    summary,
  };
}

/**
 * Create a side-by-side comparison view
 */
export function createSideBySideComparison(
  original: TraceData,
  replay: TraceData
): SideBySideComparison {
  const diff = compareTraces(original, replay);

  return {
    original,
    replay,
    diff,
  };
}

/**
 * Batch compare multiple traces
 */
export function compareTracesBatch(
  traces: Array<{ original: TraceData; replay: TraceData }>
): DiffResult[] {
  return traces.map(({ original, replay }) => compareTraces(original, replay));
}

/**
 * Calculate aggregate statistics for a batch of comparisons
 */
export interface AggregateStats {
  totalComparisons: number;
  avgHashSimilarity: number;
  avgSemanticScore: number;
  avgCostDelta: number;
  avgLatencyDelta: number;
  responseChanges: number;
  regressions: {
    cost: number; // Number of traces with cost increase
    latency: number; // Number of traces with latency increase
    quality: number; // Number of traces with quality decrease
  };
}

export function calculateAggregateStats(results: DiffResult[]): AggregateStats {
  if (results.length === 0) {
    return {
      totalComparisons: 0,
      avgHashSimilarity: 0,
      avgSemanticScore: 0,
      avgCostDelta: 0,
      avgLatencyDelta: 0,
      responseChanges: 0,
      regressions: {
        cost: 0,
        latency: 0,
        quality: 0,
      },
    };
  }

  const totalComparisons = results.length;
  const avgHashSimilarity =
    results.reduce((sum, r) => sum + r.hashSimilarity, 0) / totalComparisons;
  const avgSemanticScore =
    results.reduce((sum, r) => sum + r.semanticScore, 0) / totalComparisons;
  const avgCostDelta =
    results.reduce((sum, r) => sum + r.costDelta.absolute, 0) / totalComparisons;
  const avgLatencyDelta =
    results.reduce((sum, r) => sum + r.latencyDelta.absolute, 0) / totalComparisons;
  const responseChanges = results.filter((r) => r.responseChanged).length;

  const regressions = {
    cost: results.filter((r) => r.costDelta.absolute > 0).length,
    latency: results.filter((r) => r.latencyDelta.absolute > 0).length,
    quality: results.filter((r) => r.hashSimilarity < 0.95).length, // Significant quality drop
  };

  return {
    totalComparisons,
    avgHashSimilarity,
    avgSemanticScore,
    avgCostDelta,
    avgLatencyDelta,
    responseChanges,
    regressions,
  };
}