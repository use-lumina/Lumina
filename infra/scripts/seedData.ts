#!/usr/bin/env bun

/**
 * Seed Test Data Script
 *
 * Creates a test customer account with sample data for development/demo:
 * - Test customer with API keys
 * - Admin user (admin@test.com / admin123)
 * - 100+ sample traces with realistic data
 * - Sample alerts
 *
 * Usage:
 * bun run infra/scripts/seed-test-data.ts
 */

import postgres from 'postgres';
import { randomBytes } from 'crypto';

// Hash password using Bun's built-in password hashing
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  });
}

// Generate API key
function generateApiKey(environment: 'live' | 'test'): string {
  const randomString = randomBytes(20).toString('hex');
  return `lumina_${environment}_${randomString}`;
}

// Model configurations with token counts and costs
const models = [
  {
    name: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    avgPromptTokens: 2500,
    avgCompletionTokens: 1200,
    costPerPromptToken: 0.000003,
    costPerCompletionToken: 0.000015,
    avgLatency: 1800,
  },
  {
    name: 'gpt-4o',
    provider: 'openai',
    avgPromptTokens: 2200,
    avgCompletionTokens: 1000,
    costPerPromptToken: 0.0000025,
    costPerCompletionToken: 0.00001,
    avgLatency: 1500,
  },
  {
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    avgPromptTokens: 1800,
    avgCompletionTokens: 800,
    costPerPromptToken: 0.0000005,
    costPerCompletionToken: 0.0000015,
    avgLatency: 800,
  },
  {
    name: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    avgPromptTokens: 2000,
    avgCompletionTokens: 900,
    costPerPromptToken: 0.00000025,
    costPerCompletionToken: 0.00000125,
    avgLatency: 600,
  },
];

const services = [
  'customer-support-bot',
  'code-review-service',
  'content-generation',
  'data-extraction',
  'summarization-api',
];

const endpoints = [
  '/api/chat/completions',
  '/api/code/review',
  '/api/content/generate',
  '/api/data/extract',
  '/api/text/summarize',
];

// Sample prompts and responses
const prompts = [
  'Explain the concept of quantum computing in simple terms',
  'Write a Python function to sort a list using quicksort',
  'Summarize the key points from this customer feedback',
  'Generate product descriptions for an e-commerce store',
  'Review this code for security vulnerabilities',
  'Extract structured data from this unstructured text',
  'Create a marketing email for a product launch',
  'Translate this text to Spanish while maintaining tone',
];

const responses = [
  'Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously, allowing for parallel processing...',
  "Here's an efficient implementation of quicksort in Python:\n\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr...",
  'Based on the customer feedback, the main points are: 1) Users appreciate the fast response times, 2) Some users want more customization options...',
  'Premium Wireless Headphones - Experience crystal-clear audio with our noise-cancelling technology. Perfect for music lovers and professionals...',
  'After reviewing the code, I found the following security concerns: 1) SQL injection vulnerability on line 45, 2) Missing input validation...',
  'Extracted Data:\n- Name: John Smith\n- Email: john@example.com\n- Phone: (555) 123-4567\n- Address: 123 Main St...',
  "Subject: Introducing Our Revolutionary New Product! Dear valued customer, we're excited to announce...",
  'Traducción al español: Este texto mantiene el tono profesional y amigable del original...',
];

// Generate a random trace
function generateTrace(customerId: string, index: number) {
  const model = models[Math.floor(Math.random() * models.length)];
  const service = services[Math.floor(Math.random() * services.length)];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const response = responses[Math.floor(Math.random() * responses.length)];

  // Add some randomness to token counts and latency
  const promptTokens = Math.floor(model.avgPromptTokens * (0.7 + Math.random() * 0.6));
  const completionTokens = Math.floor(model.avgCompletionTokens * (0.7 + Math.random() * 0.6));
  const tokens = promptTokens + completionTokens;
  const latency = Math.floor(model.avgLatency * (0.8 + Math.random() * 0.4));

  // Calculate cost
  const cost =
    promptTokens * model.costPerPromptToken + completionTokens * model.costPerCompletionToken;

  // 95% success rate
  const status = Math.random() < 0.95 ? 'success' : 'error';
  const errorMessage = status === 'error' ? 'Rate limit exceeded' : null;

  // Generate timestamp within the last 7 days
  const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

  // Generate IDs
  const traceId = `trace_${randomBytes(8).toString('hex')}`;
  const spanId = `span_${randomBytes(8).toString('hex')}`;

  // Add semantic scores to some traces (70% of successful traces)
  const hasSemanticScore = status === 'success' && Math.random() < 0.7;
  const semanticScore = hasSemanticScore ? 0.85 + Math.random() * 0.14 : null;
  const hashSimilarity = hasSemanticScore ? 0.8 + Math.random() * 0.19 : null;

  return {
    traceId,
    spanId,
    customerId,
    timestamp,
    serviceName: service,
    endpoint,
    environment: 'live' as const,
    model: model.name,
    provider: model.provider as 'openai' | 'anthropic',
    prompt,
    response: status === 'success' ? response : 'Error: ' + errorMessage,
    tokens,
    promptTokens,
    completionTokens,
    latencyMs: latency,
    costUsd: cost,
    metadata: {
      request_id: `req_${randomBytes(6).toString('hex')}`,
      user_id: `user_${Math.floor(Math.random() * 1000)}`,
    },
    tags: ['production', service],
    status,
    errorMessage,
    semanticScore,
    hashSimilarity,
    semanticScoredAt: hasSemanticScore ? new Date() : null,
    semanticCached: hasSemanticScore ? Math.random() < 0.3 : false,
  };
}

async function main() {
  // Connect to database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    console.log('\nSet it with:');
    console.log('  export DATABASE_URL="postgres://lumina:lumina@localhost:5432/lumina"');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('\n🌱 Seeding test data...\n');

    // Fixed test customer ID
    const customerId = 'test-customer-001';
    const customerName = 'Test Company';
    const userId = 'test-user-001';
    const email = 'admin@test.com';
    const password = 'admin123';
    const passwordHash = await hashPassword(password);

    // Check if test customer already exists
    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      console.log('⚠️  Test customer already exists. Cleaning up old data...\n');

      // Clean up old data
      await sql`DELETE FROM alerts WHERE customer_id = ${customerId}`;
      await sql`DELETE FROM traces WHERE customer_id = ${customerId}`;
      await sql`DELETE FROM users WHERE customer_id = ${customerId}`;
      await sql`DELETE FROM api_keys WHERE customer_id = ${customerId}`;

      console.log('✓ Cleaned up old data\n');
    }

    // Generate API keys
    const liveApiKey = generateApiKey('live');
    const testApiKey = generateApiKey('test');

    // Create customer and user
    console.log('👤 Creating test customer...');
    await sql.begin(async (sql) => {
      // Create API keys
      await sql`
        INSERT INTO api_keys (api_key, customer_id, customer_name, environment, created_at, is_active)
        VALUES (${liveApiKey}, ${customerId}, ${customerName}, 'live', NOW(), true)
      `;

      await sql`
        INSERT INTO api_keys (api_key, customer_id, customer_name, environment, created_at, is_active)
        VALUES (${testApiKey}, ${customerId}, ${customerName}, 'test', NOW(), true)
      `;

      // Create user
      await sql`
        INSERT INTO users (user_id, customer_id, email, password_hash, name, is_temporary_password, created_at)
        VALUES (${userId}, ${customerId}, ${email}, ${passwordHash}, ${customerName}, false, NOW())
      `;
    });

    console.log('✓ Created test customer and user\n');

    // Generate traces
    console.log('📊 Generating 150 sample traces...');
    const traces = Array.from({ length: 150 }, (_, i) => generateTrace(customerId, i));

    // Insert traces in batches
    const batchSize = 50;
    for (let i = 0; i < traces.length; i += batchSize) {
      const batch = traces.slice(i, i + batchSize);

      await sql`
        INSERT INTO traces ${sql(
          batch.map((t) => ({
            trace_id: t.traceId,
            span_id: t.spanId,
            customer_id: t.customerId,
            timestamp: t.timestamp,
            service_name: t.serviceName,
            endpoint: t.endpoint,
            environment: t.environment,
            model: t.model,
            provider: t.provider,
            prompt: t.prompt,
            response: t.response,
            tokens: t.tokens,
            prompt_tokens: t.promptTokens,
            completion_tokens: t.completionTokens,
            latency_ms: t.latencyMs,
            cost_usd: t.costUsd,
            metadata: t.metadata,
            tags: t.tags,
            status: t.status,
            error_message: t.errorMessage,
            semantic_score: t.semanticScore,
            hash_similarity: t.hashSimilarity,
            semantic_scored_at: t.semanticScoredAt,
            semantic_cached: t.semanticCached,
          }))
        )}
      `;

      console.log(`  ✓ Inserted ${Math.min(i + batchSize, traces.length)}/${traces.length} traces`);
    }

    console.log('✓ Created all traces\n');

    // Create sample alerts
    console.log('⚠️  Creating sample alerts...');

    // Find some traces to link alerts to
    const tracesForAlerts = traces.slice(0, 5);

    const alerts = [
      {
        traceId: tracesForAlerts[0].traceId,
        spanId: tracesForAlerts[0].spanId,
        customerId,
        alertType: 'cost_spike' as const,
        severity: 'HIGH' as const,
        currentCost: tracesForAlerts[0].costUsd,
        baselineCost: tracesForAlerts[0].costUsd * 0.5,
        costIncreasePercent: 100,
        serviceName: tracesForAlerts[0].serviceName,
        endpoint: tracesForAlerts[0].endpoint,
        model: tracesForAlerts[0].model,
        reasoning: 'Cost increased by 100% compared to 7-day baseline',
        timestamp: tracesForAlerts[0].timestamp,
        status: 'pending' as const,
      },
      {
        traceId: tracesForAlerts[1].traceId,
        spanId: tracesForAlerts[1].spanId,
        customerId,
        alertType: 'quality_drop' as const,
        severity: 'MEDIUM' as const,
        hashSimilarity: 0.65,
        semanticScore: 0.72,
        scoringMethod: 'both' as const,
        serviceName: tracesForAlerts[1].serviceName,
        endpoint: tracesForAlerts[1].endpoint,
        model: tracesForAlerts[1].model,
        reasoning: 'Semantic similarity dropped below threshold (0.85)',
        timestamp: tracesForAlerts[1].timestamp,
        status: 'acknowledged' as const,
      },
      {
        traceId: tracesForAlerts[2].traceId,
        spanId: tracesForAlerts[2].spanId,
        customerId,
        alertType: 'cost_and_quality' as const,
        severity: 'HIGH' as const,
        currentCost: tracesForAlerts[2].costUsd,
        baselineCost: tracesForAlerts[2].costUsd * 0.6,
        costIncreasePercent: 66.67,
        hashSimilarity: 0.68,
        semanticScore: 0.75,
        scoringMethod: 'semantic' as const,
        serviceName: tracesForAlerts[2].serviceName,
        endpoint: tracesForAlerts[2].endpoint,
        model: tracesForAlerts[2].model,
        reasoning: 'Both cost increased by 67% and quality dropped',
        timestamp: tracesForAlerts[2].timestamp,
        status: 'pending' as const,
      },
    ];

    await sql`
      INSERT INTO alerts ${sql(
        alerts.map((a) => ({
          trace_id: a.traceId,
          span_id: a.spanId,
          customer_id: a.customerId,
          alert_type: a.alertType,
          severity: a.severity,
          current_cost: a.currentCost || null,
          baseline_cost: a.baselineCost || null,
          cost_increase_percent: a.costIncreasePercent || null,
          hash_similarity: a.hashSimilarity || null,
          semantic_score: a.semanticScore || null,
          scoring_method: a.scoringMethod || null,
          service_name: a.serviceName,
          endpoint: a.endpoint,
          model: a.model,
          reasoning: a.reasoning,
          timestamp: a.timestamp,
          status: a.status,
        }))
      )}
    `;

    console.log('✓ Created 3 sample alerts\n');

    // Success output
    console.log('✅ Test data seeded successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Customer ID:      ${customerId}`);
    console.log(`Customer Name:    ${customerName}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔑 API Keys:');
    console.log(`  Live:  ${liveApiKey}`);
    console.log(`  Test:  ${testApiKey}\n`);

    console.log('👤 Login Credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}\n`);

    console.log('📊 Seeded Data:');
    console.log(`  Traces:  ${traces.length}`);
    console.log(`  Alerts:  ${alerts.length}`);
    console.log(`  Services: ${services.length}`);
    console.log(`  Models:   ${models.length}\n`);

    console.log('🚀 Next Steps:');
    console.log('  1. Start the API server: bun run dev:api');
    console.log('  2. Start the dashboard: cd apps/dashboard && bun run dev');
    console.log('  3. Login with admin@test.com / admin123\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
