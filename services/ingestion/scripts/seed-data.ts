/**
 * Seed PostgreSQL database with sample data
 * Creates test traces and baselines for development/testing
 */

import { getDB } from '../src/database/postgres';
import { calculateBaseline, type CostSample } from '@lumina/core';
import type { Trace } from '@lumina/schema';

async function main() {
  const db = getDB();

  try {
    await db.initialize();

    // Sample trace data
    const sampleTraces: Trace[] = [
      {
        trace_id: 'test-trace-001',
        span_id: 'span-001',
        customer_id: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        service_name: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        prompt: 'What is the capital of France?',
        response: 'The capital of France is Paris.',
        tokens: 50,
        prompt_tokens: 10,
        completion_tokens: 40,
        latency_ms: 1200,
        cost_usd: 0.00025,
        status: 'success',
        tags: ['test', 'rag'],
      },
      {
        trace_id: 'test-trace-002',
        span_id: 'span-002',
        customer_id: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        service_name: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        prompt: 'Explain quantum computing',
        response: 'Quantum computing uses quantum mechanics principles...',
        tokens: 120,
        prompt_tokens: 20,
        completion_tokens: 100,
        latency_ms: 2500,
        cost_usd: 0.00066,
        status: 'success',
        tags: ['test', 'rag'],
      },
      {
        trace_id: 'test-trace-003',
        span_id: 'span-003',
        customer_id: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        service_name: 'rag-service',
        endpoint: '/api/search',
        environment: 'test',
        model: 'gpt-4o-mini',
        provider: 'openai',
        prompt: 'Search for documents about ML',
        response: 'Found 5 documents about machine learning...',
        tokens: 75,
        prompt_tokens: 15,
        completion_tokens: 60,
        latency_ms: 800,
        cost_usd: 0.000015,
        status: 'success',
        tags: ['test', 'search'],
      },
      {
        trace_id: 'test-trace-004',
        span_id: 'span-004',
        customer_id: 'customer-test-001',
        timestamp: new Date(),
        service_name: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        prompt: 'Generate code for a simple API',
        response: 'Error: Token limit exceeded',
        tokens: 200,
        prompt_tokens: 50,
        completion_tokens: 150,
        latency_ms: 500,
        cost_usd: 0.00155,
        status: 'error',
        error_message: 'Token limit exceeded',
        tags: ['test', 'error'],
      },
    ];

    // Insert sample traces
    await db.traces.insertBatch(sampleTraces);
    // eslint-disable-next-line no-console
    console.log(`✓ Inserted ${sampleTraces.length} sample traces`);

    // Calculate and insert baseline for /api/chat endpoint
    const chatSamples: CostSample[] = [
      { costUsd: 0.00025, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
      { costUsd: 0.00066, timestamp: new Date(Date.now() - 1000 * 60 * 60) },
      { costUsd: 0.00155, timestamp: new Date() },
    ];

    const chatBaseline = calculateBaseline('rag-service', '/api/chat', chatSamples, '24h');
    await db.baselines.upsertBaseline(chatBaseline);
    // eslint-disable-next-line no-console
    console.log('✓ Created baseline for /api/chat');
    // eslint-disable-next-line no-console
    console.log(
      `  - P50: $${chatBaseline.p50Cost.toFixed(6)}, P95: $${chatBaseline.p95Cost.toFixed(6)}, P99: $${chatBaseline.p99Cost.toFixed(6)}`
    );

    // Calculate and insert baseline for /api/search endpoint
    const searchSamples: CostSample[] = [
      { costUsd: 0.000015, timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    ];

    const searchBaseline = calculateBaseline('rag-service', '/api/search', searchSamples, '24h');
    await db.baselines.upsertBaseline(searchBaseline);
    // eslint-disable-next-line no-console
    console.log('✓ Created baseline for /api/search');
    // eslint-disable-next-line no-console
    console.log(
      `  - P50: $${searchBaseline.p50Cost.toFixed(6)}, P95: $${searchBaseline.p95Cost.toFixed(6)}, P99: $${searchBaseline.p99Cost.toFixed(6)}`
    );

    await db.close();
    // eslint-disable-next-line no-console
    console.log('\n✓ Database seeding complete');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('✗ Database seeding failed:', error);
    process.exit(1);
  }
}

main();
