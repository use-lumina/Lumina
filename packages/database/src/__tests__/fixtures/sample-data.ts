/**
 * Sample Test Data Fixtures
 * Provides reusable test data for all test files
 */

import type {
  NewTrace,
  NewAlert,
  NewCostBaseline,
  NewApiKey,
  NewUser,
  NewReplaySet,
} from '../../index';

/**
 * Generate a random ID for testing
 */
function randomId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a sample trace for testing
 */
export function createSampleTrace(overrides?: Partial<NewTrace>): NewTrace {
  return {
    traceId: randomId('trace'),
    spanId: randomId('span'),
    customerId: 'test-customer-001',
    timestamp: new Date(),
    serviceName: 'test-service',
    endpoint: '/api/test',
    environment: 'test',
    model: 'gpt-4',
    provider: 'openai',
    prompt: 'Test prompt',
    response: 'Test response',
    tokens: 100,
    promptTokens: 50,
    completionTokens: 50,
    latencyMs: 500,
    costUsd: 0.001,
    status: 'success',
    ...overrides,
  };
}

/**
 * Create a sample alert for testing
 */
export function createSampleAlert(
  traceId: string,
  spanId: string,
  overrides?: Partial<NewAlert>
): NewAlert {
  return {
    traceId,
    spanId,
    customerId: 'test-customer-001',
    alertType: 'cost_spike',
    severity: 'HIGH',
    currentCost: 0.05,
    baselineCost: 0.01,
    costIncreasePercent: 400,
    serviceName: 'test-service',
    endpoint: '/api/test',
    reasoning: 'Cost exceeded baseline by 4x',
    timestamp: new Date(),
    status: 'pending',
    ...overrides,
  };
}

/**
 * Create a sample baseline for testing
 */
export function createSampleBaseline(overrides?: Partial<NewCostBaseline>): NewCostBaseline {
  return {
    serviceName: 'test-service',
    endpoint: '/api/test',
    windowSize: '24h',
    p50Cost: 0.01,
    p95Cost: 0.05,
    p99Cost: 0.1,
    sampleCount: 1000,
    ...overrides,
  };
}

/**
 * Create a sample API key for testing
 */
export function createSampleApiKey(overrides?: Partial<NewApiKey>): NewApiKey {
  return {
    apiKey: randomId('lum'),
    customerId: 'test-customer-001',
    customerName: 'Test Customer',
    environment: 'test',
    isActive: true,
    ...overrides,
  };
}

/**
 * Create a sample user for testing
 */
export function createSampleUser(overrides?: Partial<NewUser>): NewUser {
  return {
    userId: randomId('user'),
    customerId: 'test-customer-001',
    email: `test-${randomId()}@example.com`,
    passwordHash: '$2b$10$test.hash.here',
    name: 'Test User',
    isTemporaryPassword: false,
    ...overrides,
  };
}

/**
 * Create a sample replay set for testing
 */
export function createSampleReplaySet(
  traceIds: string[],
  overrides?: Partial<NewReplaySet>
): NewReplaySet {
  return {
    name: 'Test Replay Set',
    description: 'Test replay set for testing',
    traceIds,
    totalTraces: traceIds.length,
    status: 'pending',
    ...overrides,
  };
}

/**
 * Create multiple sample traces
 */
export function createSampleTraces(count: number, overrides?: Partial<NewTrace>): NewTrace[] {
  return Array.from({ length: count }, () => createSampleTrace(overrides));
}

/**
 * Create a sample replay result for testing
 */
export function createSampleReplayResult(
  replayId: string,
  traceId: string,
  spanId: string,
  overrides?: any
) {
  return {
    replayId,
    traceId,
    spanId,
    originalResponse: 'Original response',
    replayResponse: 'Replayed response',
    originalCost: '0.001',
    replayCost: '0.001',
    originalLatency: 500,
    replayLatency: 500,
    semanticScore: '0.95',
    status: 'success',
    ...overrides,
  };
}

/**
 * Seed test database with sample traces
 */
export async function seedTestTraces(db: any, count: number): Promise<NewTrace[]> {
  const traces = createSampleTraces(count);
  const { insertTracesBatch } = await import('../../queries/traces');
  await insertTracesBatch(db, traces);
  return traces;
}
