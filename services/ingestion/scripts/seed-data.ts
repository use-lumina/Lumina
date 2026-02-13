/**
 * Seed PostgreSQL database with sample data
 * Creates test traces and baselines for development/testing
 */

import {
  createDatabase,
  insertTracesBatch,
  upsertBaseline,
  calculatePercentiles,
} from '@lumina/database';
import type { NewTrace } from '@lumina/database';

async function main() {
  const { db, client } = createDatabase({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/lumina',
  });

  try {
    console.log('Seeding database with sample data...');

    // Sample trace data
    const sampleTraces: NewTrace[] = [
      {
        traceId: 'test-trace-001',
        spanId: 'span-001',
        customerId: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        serviceName: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        prompt: 'What is the capital of France?',
        response: 'The capital of France is Paris.',
        tokens: 50,
        promptTokens: 10,
        completionTokens: 40,
        latencyMs: 1200,
        costUsd: 0.00025,
        status: 'success',
        tags: ['test', 'rag'],
      },
      {
        traceId: 'test-trace-002',
        spanId: 'span-002',
        customerId: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        serviceName: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        prompt: 'Explain quantum computing',
        response: 'Quantum computing uses quantum mechanics principles...',
        tokens: 120,
        promptTokens: 20,
        completionTokens: 100,
        latencyMs: 2500,
        costUsd: 0.00066,
        status: 'success',
        tags: ['test', 'rag'],
      },
      {
        traceId: 'test-trace-003',
        spanId: 'span-003',
        customerId: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        serviceName: 'rag-service',
        endpoint: '/api/search',
        environment: 'test',
        model: 'gpt-4o-mini',
        provider: 'openai',
        prompt: 'Search for documents about ML',
        response: 'Found 5 documents about machine learning...',
        tokens: 75,
        promptTokens: 15,
        completionTokens: 60,
        latencyMs: 800,
        costUsd: 0.000015,
        status: 'success',
        tags: ['test', 'search'],
      },
      {
        traceId: 'test-trace-004',
        spanId: 'span-004',
        customerId: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        serviceName: 'analytics-service',
        endpoint: '/api/analyze',
        environment: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        prompt: 'Analyze this data: [...]',
        response: 'Based on the data analysis...',
        tokens: 200,
        promptTokens: 80,
        completionTokens: 120,
        latencyMs: 3200,
        costUsd: 0.00045,
        status: 'success',
        tags: ['test', 'analytics'],
      },
      {
        traceId: 'test-trace-005',
        spanId: 'span-005',
        customerId: 'customer-test-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        serviceName: 'rag-service',
        endpoint: '/api/chat',
        environment: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        prompt: 'Tell me about AI ethics',
        response: 'AI ethics involves...',
        tokens: 150,
        promptTokens: 25,
        completionTokens: 125,
        latencyMs: 1800,
        costUsd: 0.00034,
        status: 'success',
        tags: ['test', 'rag', 'ethics'],
      },
    ];

    // Insert traces
    await insertTracesBatch(db, sampleTraces);
    console.log(`✓ Inserted ${sampleTraces.length} sample traces`);

    // Calculate and insert baseline for rag-service /api/chat
    const chatCosts = sampleTraces
      .filter((t) => t.serviceName === 'rag-service' && t.endpoint === '/api/chat')
      .map((t) => t.costUsd || 0);

    const chatPercentiles = calculatePercentiles(chatCosts);

    await upsertBaseline(db, {
      serviceName: 'rag-service',
      endpoint: '/api/chat',
      windowSize: '24h',
      p50Cost: chatPercentiles.p50,
      p95Cost: chatPercentiles.p95,
      p99Cost: chatPercentiles.p99,
      sampleCount: chatCosts.length,
    });

    console.log('✓ Created baseline for rag-service /api/chat');
    console.log(`  P50: $${chatPercentiles.p50.toFixed(6)}`);
    console.log(`  P95: $${chatPercentiles.p95.toFixed(6)}`);
    console.log(`  P99: $${chatPercentiles.p99.toFixed(6)}`);

    await client.end();
    console.log('\n✓ Database seeding complete');
  } catch (error) {
    console.error('✗ Database seeding failed:', error);
    await client.end();
    process.exit(1);
  }
}

main();
