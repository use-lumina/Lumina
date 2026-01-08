/**
 * Alert Engine - Hybrid quality detection system
 * Combines fast hash-based checks with accurate semantic scoring
 */

import { randomUUID } from 'crypto';
import { type Baseline, isAnomalous } from './baseline';
import { hashResponse, calculateHashSimilarity } from './hash';
import { scoreSemanticQuality, type SemanticScore } from './semantic-scorer';

export interface Alert {
  alertId: string;
  timestamp: Date;
  traceId: string;
  alertType: 'cost_spike' | 'quality_drop' | 'latency_spike' | 'cost_and_quality';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: AlertDetails;
}

export interface AlertDetails {
  // Cost-related
  currentCost?: number;
  baselineCost?: number;
  costIncreasePercent?: number;

  // Quality-related
  hashSimilarity?: number;
  semanticScore?: number;
  scoringMethod?: 'hash_only' | 'semantic' | 'both';
  cached?: boolean;

  // Metadata
  serviceName: string;
  endpoint: string;
  model?: string;
  prompt?: string;
  response?: string;
  reasoning?: string;
}

export interface AnalyzeTraceInput {
  traceId: string;
  serviceName: string;
  endpoint: string;
  model: string;
  prompt: string;
  response: string;
  costUsd: number;
  baseline?: Baseline;
  referenceResponse?: string; // For quality comparison
}

export interface AlertConfig {
  // Cost thresholds
  costThreshold: 'p95' | 'p99';
  costMarginPercent: number;

  // Quality thresholds
  hashSimilarityThreshold: number; // Default: 0.8 (80% similar)
  semanticScoreThreshold: number; // Default: 0.7 (quality drop if below)

  // Semantic scoring triggers
  alwaysScoreSemantically?: boolean; // Default: false
  scoreSemanticallyOnCostSpike?: boolean; // Default: true
  scoreSemanticallyOnHashDrop?: boolean; // Default: true

  // Severity rules
  highSeverityCostMultiplier: number; // Default: 2.0 (2x baseline)
  highSeverityQualityThreshold: number; // Default: 0.5
}

const DEFAULT_CONFIG: AlertConfig = {
  costThreshold: 'p95',
  costMarginPercent: 20,
  hashSimilarityThreshold: 0.8,
  semanticScoreThreshold: 0.7,
  alwaysScoreSemantically: false,
  scoreSemanticallyOnCostSpike: true,
  scoreSemanticallyOnHashDrop: true,
  highSeverityCostMultiplier: 2.0,
  highSeverityQualityThreshold: 0.5,
};

/**
 * Analyze a trace and generate alerts using hybrid detection
 *
 * Strategy:
 * 1. Always check cost spike against baseline
 * 2. Always check hash similarity (fast, ~1ms)
 * 3. Run semantic scorer IF:
 *    - Always enabled OR
 *    - Cost spike detected OR
 *    - Hash similarity below threshold
 * 4. Generate alerts for cost spikes, quality drops, or both
 */
export async function analyzeTrace(
  input: AnalyzeTraceInput,
  config: Partial<AlertConfig> = {}
): Promise<Alert[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const alerts: Alert[] = [];

  // Step 1: Check cost spike
  const costAlert = checkCostSpike(input, cfg);
  const hasCostSpike = costAlert !== null;

  // Step 2: Check hash similarity (always run - fast)
  const hashAlert = input.referenceResponse ? await checkHashSimilarity(input, cfg) : null;
  const hasHashDrop = hashAlert !== null;

  // Step 3: Determine if we need semantic scoring
  const needsSemanticScoring =
    cfg.alwaysScoreSemantically ||
    (cfg.scoreSemanticallyOnCostSpike && hasCostSpike) ||
    (cfg.scoreSemanticallyOnHashDrop && hasHashDrop);

  let semanticAlert: Alert | null = null;
  let semanticScore: SemanticScore | null = null;

  if (needsSemanticScoring && input.referenceResponse) {
    const result = await checkSemanticQuality(input, cfg);
    semanticAlert = result.alert;
    semanticScore = result.score;
  }

  // Step 4: Generate final alerts
  // Priority: Combined alert > Individual alerts
  if (hasCostSpike && (hasHashDrop || semanticAlert)) {
    // If we have both cost and quality issues, create a combined alert
    alerts.push(createCombinedAlert(input, costAlert!, hashAlert, semanticAlert, semanticScore));
  } else {
    // Add individual alerts
    if (costAlert) alerts.push(costAlert);

    // Add quality alert (prefer semantic over hash if both exist)
    if (semanticAlert) {
      alerts.push(semanticAlert);
    } else if (hashAlert) {
      // Add hash alert even if semantic scoring was attempted but failed/returned null
      alerts.push(hashAlert);
    }
  }

  return alerts;
}

/**
 * Check for cost spike against baseline
 */
function checkCostSpike(input: AnalyzeTraceInput, config: AlertConfig): Alert | null {
  if (!input.baseline) return null;

  const anomaly = isAnomalous(
    input.costUsd,
    input.baseline,
    config.costThreshold,
    config.costMarginPercent
  );

  if (!anomaly.isAnomaly) return null;

  const baselineCost = input.baseline.p50Cost;
  const severity = determineCostSeverity(input.costUsd, baselineCost, config);

  return {
    alertId: randomUUID(),
    timestamp: new Date(),
    traceId: input.traceId,
    alertType: 'cost_spike',
    severity,
    details: {
      currentCost: input.costUsd,
      baselineCost,
      costIncreasePercent: anomaly.percentageAboveBaseline,
      serviceName: input.serviceName,
      endpoint: input.endpoint,
      model: input.model,
      scoringMethod: 'hash_only',
    },
  };
}

/**
 * Check hash-based similarity (fast, structural comparison)
 */
async function checkHashSimilarity(
  input: AnalyzeTraceInput,
  config: AlertConfig
): Promise<Alert | null> {
  if (!input.referenceResponse) return null;

  const currentHash = hashResponse(input.response);
  const referenceHash = hashResponse(input.referenceResponse);
  const similarity = calculateHashSimilarity(currentHash, [referenceHash]);

  console.log(
    `[QUALITY CHECK] Hash similarity=${similarity.toFixed(3)}, threshold=${config.hashSimilarityThreshold}, qualityDrop=${similarity < config.hashSimilarityThreshold}`
  );

  if (similarity >= config.hashSimilarityThreshold) return null;

  const severity = determineQualitySeverity(similarity, null, config);

  return {
    alertId: randomUUID(),
    timestamp: new Date(),
    traceId: input.traceId,
    alertType: 'quality_drop',
    severity,
    details: {
      hashSimilarity: similarity,
      scoringMethod: 'hash_only',
      serviceName: input.serviceName,
      endpoint: input.endpoint,
      model: input.model,
      prompt: input.prompt,
      response: input.response,
    },
  };
}

/**
 * Check semantic quality using Claude Haiku (accurate, slower)
 */
async function checkSemanticQuality(
  input: AnalyzeTraceInput,
  config: AlertConfig
): Promise<{ alert: Alert | null; score: SemanticScore }> {
  const score = await scoreSemanticQuality(input.prompt, input.response, {
    includeReasoning: true,
    useCache: true,
  });

  if (score.score >= config.semanticScoreThreshold) {
    return { alert: null, score };
  }

  const severity = determineQualitySeverity(null, score.score, config);

  return {
    alert: {
      alertId: randomUUID(),
      timestamp: new Date(),
      traceId: input.traceId,
      alertType: 'quality_drop',
      severity,
      details: {
        semanticScore: score.score,
        scoringMethod: 'semantic',
        cached: score.cached,
        serviceName: input.serviceName,
        endpoint: input.endpoint,
        model: input.model,
        prompt: input.prompt,
        response: input.response,
        reasoning: score.reasoning,
      },
    },
    score,
  };
}

/**
 * Create combined cost + quality alert
 */
function createCombinedAlert(
  input: AnalyzeTraceInput,
  costAlert: Alert,
  hashAlert: Alert | null,
  semanticAlert: Alert | null,
  semanticScore: SemanticScore | null
): Alert {
  const costDetails = costAlert.details;
  const qualityDetails = (semanticAlert?.details || hashAlert?.details) as AlertDetails;

  // Determine combined severity (use highest)
  const severities = [costAlert.severity, hashAlert?.severity, semanticAlert?.severity].filter(
    Boolean
  ) as Array<'LOW' | 'MEDIUM' | 'HIGH'>;
  const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const maxSeverity = severities.reduce((max, s) =>
    severityOrder[s] > severityOrder[max] ? s : max
  );

  return {
    alertId: randomUUID(),
    timestamp: new Date(),
    traceId: input.traceId,
    alertType: 'cost_and_quality',
    severity: maxSeverity,
    details: {
      // Cost metrics
      currentCost: costDetails.currentCost,
      baselineCost: costDetails.baselineCost,
      costIncreasePercent: costDetails.costIncreasePercent,

      // Quality metrics
      hashSimilarity: qualityDetails.hashSimilarity,
      semanticScore: qualityDetails.semanticScore || semanticScore?.score,
      scoringMethod: qualityDetails.semanticScore ? 'both' : 'hash_only',
      cached: qualityDetails.cached,

      // Metadata
      serviceName: input.serviceName,
      endpoint: input.endpoint,
      model: input.model,
      prompt: input.prompt,
      response: input.response,
      reasoning: qualityDetails.reasoning,
    },
  };
}

/**
 * Determine cost alert severity
 */
function determineCostSeverity(
  currentCost: number,
  baselineCost: number,
  config: AlertConfig
): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (baselineCost === 0) return 'MEDIUM';

  const multiplier = currentCost / baselineCost;

  if (multiplier >= config.highSeverityCostMultiplier) return 'HIGH';
  if (multiplier >= 1.5) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine quality alert severity
 */
function determineQualitySeverity(
  hashSimilarity: number | null,
  semanticScore: number | null,
  config: AlertConfig
): 'LOW' | 'MEDIUM' | 'HIGH' {
  // Prefer semantic score if available
  const score = semanticScore !== null ? semanticScore : hashSimilarity;
  if (score === null) return 'MEDIUM';

  if (score <= config.highSeverityQualityThreshold) return 'HIGH';
  if (score <= 0.6) return 'MEDIUM';
  return 'LOW';
}
