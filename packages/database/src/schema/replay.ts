import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  foreignKey,
  numeric,
} from 'drizzle-orm/pg-core';
import { traces } from './traces';

/**
 * Replay Sets Table Schema
 * Stores collections of traces to replay with modified parameters
 */
export const replaySets = pgTable(
  'replay_sets',
  {
    replayId: uuid('replay_id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    traceIds: text('trace_ids').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    createdBy: text('created_by'),
    status: text('status').notNull().default('pending'),
    totalTraces: integer('total_traces').notNull(),
    completedTraces: integer('completed_traces').default(0),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    // Index for status queries
    statusIdx: index('idx_replay_sets_status').on(table.status),
  })
);

/**
 * Replay Results Table Schema
 * Stores individual replay execution results with similarity scores
 */
export const replayResults = pgTable(
  'replay_results',
  {
    resultId: uuid('result_id').defaultRandom().primaryKey(),
    replayId: uuid('replay_id').notNull(),
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    spanId: varchar('span_id', { length: 255 }).notNull(),

    // Original vs Replay comparison
    originalResponse: text('original_response').notNull(),
    replayResponse: text('replay_response').notNull(),
    originalCost: numeric('original_cost', { precision: 10, scale: 6 }).notNull(),
    replayCost: numeric('replay_cost', { precision: 10, scale: 6 }).notNull(),
    originalLatency: integer('original_latency').notNull(),
    replayLatency: integer('replay_latency').notNull(),

    // Similarity metrics
    hashSimilarity: numeric('hash_similarity', { precision: 5, scale: 4 }),
    semanticScore: numeric('semantic_score', { precision: 5, scale: 4 }),
    diffSummary: jsonb('diff_summary'),

    // Replay configuration
    replayPrompt: text('replay_prompt'),
    replayModel: text('replay_model'),
    replaySystemPrompt: text('replay_system_prompt'),

    // Metadata
    executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    status: text('status').notNull().default('completed'),
  },
  (table) => ({
    // Foreign key to replay_sets
    replaySetFk: foreignKey({
      columns: [table.replayId],
      foreignColumns: [replaySets.replayId],
      name: 'replay_results_replay_set_fk',
    }).onDelete('cascade'),

    // Composite foreign key to traces
    traceFk: foreignKey({
      columns: [table.traceId, table.spanId],
      foreignColumns: [traces.traceId, traces.spanId],
      name: 'replay_results_trace_fk',
    }).onDelete('cascade'),

    // Indexes for queries
    replayIdIdx: index('idx_replay_results_replay_id').on(table.replayId),
    traceIdIdx: index('idx_replay_results_trace_id').on(table.traceId),
  })
);

// TypeScript types inferred from schema
export type ReplaySet = typeof replaySets.$inferSelect;
export type NewReplaySet = typeof replaySets.$inferInsert;

export type ReplayResult = typeof replayResults.$inferSelect;
export type NewReplayResult = typeof replayResults.$inferInsert;
