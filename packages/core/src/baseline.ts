/**
 * Baseline Calculator for cost anomaly detection
 * Computes P50, P95, P99 percentiles for cost metrics
 */

export interface Baseline {
  serviceName: string;
  endpoint: string;
  window: '1h' | '24h' | '7d';
  p50Cost: number;
  p95Cost: number;
  p99Cost: number;
  sampleCount: number;
  lastUpdated: Date;
}

export interface CostSample {
  costUsd: number;
  timestamp: Date;
}

/**
 * Calculate percentiles from cost samples
 */
export function calculateBaseline(
  serviceName: string,
  endpoint: string,
  samples: CostSample[],
  window: '1h' | '24h' | '7d' = '24h'
): Baseline {
  if (samples.length === 0) {
    return {
      serviceName,
      endpoint,
      window,
      p50Cost: 0,
      p95Cost: 0,
      p99Cost: 0,
      sampleCount: 0,
      lastUpdated: new Date(),
    };
  }

  // Sort costs in ascending order
  const costs = samples.map((s) => s.costUsd).sort((a, b) => a - b);

  return {
    serviceName,
    endpoint,
    window,
    p50Cost: percentile(costs, 50),
    p95Cost: percentile(costs, 95),
    p99Cost: percentile(costs, 99),
    sampleCount: costs.length,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate a specific percentile from sorted array
 * Uses linear interpolation for accuracy
 */
export function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  if (sortedArray.length === 1) return sortedArray[0];

  // Handle edge cases
  if (p <= 0) return sortedArray[0];
  if (p >= 100) return sortedArray[sortedArray.length - 1];

  // Calculate index with linear interpolation
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedArray[lower];
  }

  // Linear interpolation between values
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Check if a cost value is anomalous compared to baseline
 */
export function isAnomalous(
  cost: number,
  baseline: Baseline,
  threshold: 'p95' | 'p99' = 'p95',
  marginPercent: number = 20
): {
  isAnomaly: boolean;
  percentageAboveBaseline: number;
  thresholdUsed: number;
} {
  const baselineValue = threshold === 'p95' ? baseline.p95Cost : baseline.p99Cost;
  const thresholdValue = baselineValue * (1 + marginPercent / 100);

  const isAnomaly = cost > thresholdValue;
  const percentageAbove =
    baseline.p50Cost > 0 ? ((cost - baseline.p50Cost) / baseline.p50Cost) * 100 : 0;

  return {
    isAnomaly,
    percentageAboveBaseline: percentageAbove,
    thresholdUsed: thresholdValue,
  };
}

/**
 * Filter samples to a specific time window
 */
export function filterSamplesByWindow(
  samples: CostSample[],
  window: '1h' | '24h' | '7d'
): CostSample[] {
  const now = new Date();
  const windowMs = getWindowMs(window);
  const cutoff = new Date(now.getTime() - windowMs);

  return samples.filter((s) => s.timestamp >= cutoff);
}

/**
 * Convert window string to milliseconds
 */
function getWindowMs(window: '1h' | '24h' | '7d'): number {
  switch (window) {
    case '1h':
      return 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Calculate multiple baselines for different time windows
 */
export function calculateMultiWindowBaselines(
  serviceName: string,
  endpoint: string,
  samples: CostSample[]
): Baseline[] {
  const windows: Array<'1h' | '24h' | '7d'> = ['1h', '24h', '7d'];

  return windows.map((window) => {
    const filtered = filterSamplesByWindow(samples, window);
    return calculateBaseline(serviceName, endpoint, filtered, window);
  });
}

/**
 * Get summary statistics for baseline data
 */
export function getBaselineSummary(baseline: Baseline): {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  range: number;
} {
  return {
    mean: baseline.p50Cost, // P50 is a reasonable approximation of mean
    median: baseline.p50Cost,
    p95: baseline.p95Cost,
    p99: baseline.p99Cost,
    range: baseline.p99Cost - baseline.p50Cost,
  };
}
