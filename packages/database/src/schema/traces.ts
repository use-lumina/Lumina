import {
  pgTable,
  varchar,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  index,
  primaryKey,
  boolean,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Traces Table Schema
 * Stores LLM trace data with composite primary key (trace_id, span_id)
 */
export const traces = pgTable(
  'traces',
  {
    // Identifiers
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    spanId: varchar('span_id', { length: 255 }).notNull(),
    parentSpanId: varchar('parent_span_id', { length: 255 }),
    customerId: varchar('customer_id', { length: 255 }).notNull(),

    // Timestamps
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull(),

    // Service context
    serviceName: varchar('service_name', { length: 255 }).notNull(),
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    environment: varchar('environment', { length: 10 }).default('live').notNull(),

    // Model information
    model: varchar('model', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 50 }),

    // Request/Response
    prompt: text('prompt'),
    response: text('response'),

    // Metrics
    tokens: integer('tokens').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    latencyMs: doublePrecision('latency_ms').notNull(),
    costUsd: doublePrecision('cost_usd').default(0),

    // Metadata
    metadata: jsonb('metadata'),
    tags: text('tags').array(),

    // Status
    status: varchar('status', { length: 20 }).notNull(),
    errorMessage: text('error_message'),

    // Semantic scoring (added in migration 003)
    semanticScore: doublePrecision('semantic_score'),
    hashSimilarity: doublePrecision('hash_similarity'),
    semanticScoredAt: timestamp('semantic_scored_at', { withTimezone: true, mode: 'date' }),
    semanticCached: boolean('semantic_cached').default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.traceId, table.spanId] }),

    // Indexes for common query patterns
    customerTimestampIdx: index('idx_customer_timestamp').on(
      table.customerId,
      sql`${table.timestamp} DESC`
    ),
    customerEnvironmentIdx: index('idx_customer_environment').on(
      table.customerId,
      table.environment
    ),
    customerStatusIdx: index('idx_customer_status').on(table.customerId, table.status),
    customerServiceIdx: index('idx_customer_service').on(table.customerId, table.serviceName),
    modelIdx: index('idx_model').on(table.model),
    providerIdx: index('idx_provider').on(table.provider),
    semanticScoreIdx: index('idx_traces_semantic_score')
      .on(table.semanticScore)
      .where(sql`${table.semanticScore} IS NOT NULL`),

    // CHECK constraints
    environmentCheck: check(
      'traces_environment_check',
      sql`${table.environment} IN ('live', 'test')`
    ),
    providerCheck: check(
      'traces_provider_check',
      sql`${table.provider} IN ('openai', 'anthropic', 'cohere', 'other')`
    ),
    statusCheck: check('traces_status_check', sql`${table.status} IN ('success', 'error')`),
  })
);

// TypeScript types inferred from schema
export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;
