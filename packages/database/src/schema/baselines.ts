import {
  pgTable,
  serial,
  varchar,
  doublePrecision,
  integer,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Cost Baselines Table Schema
 * Stores historical cost percentiles for anomaly detection
 */
export const costBaselines = pgTable(
  'cost_baselines',
  {
    id: serial('id').primaryKey(),
    serviceName: varchar('service_name', { length: 255 }).notNull(),
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    windowSize: varchar('window_size', { length: 10 }).notNull(),
    p50Cost: doublePrecision('p50_cost').notNull(),
    p95Cost: doublePrecision('p95_cost').notNull(),
    p99Cost: doublePrecision('p99_cost').notNull(),
    sampleCount: integer('sample_count').notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    // Unique constraint: one baseline per service+endpoint+window combination
    serviceEndpointWindowUnique: unique('cost_baselines_service_endpoint_window_unique').on(
      table.serviceName,
      table.endpoint,
      table.windowSize
    ),

    // Index for baseline queries
    serviceEndpointIdx: index('idx_baseline_service_endpoint').on(
      table.serviceName,
      table.endpoint
    ),

    // CHECK constraint for window_size
    windowSizeCheck: check(
      'cost_baselines_window_size_check',
      sql`${table.windowSize} IN ('1h', '24h', '7d')`
    ),
  })
);

// TypeScript types inferred from schema
export type CostBaseline = typeof costBaselines.$inferSelect;
export type NewCostBaseline = typeof costBaselines.$inferInsert;
