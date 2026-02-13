import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  timestamp,
  boolean,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { traces } from './traces';

/**
 * Alerts Table Schema
 * Stores cost spike, quality drop, and latency alerts
 * Has composite foreign key to traces (trace_id, span_id)
 */
export const alerts = pgTable(
  'alerts',
  {
    // Primary key
    alertId: uuid('alert_id').defaultRandom().primaryKey(),

    // Link to trace (composite foreign key)
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    spanId: varchar('span_id', { length: 255 }).notNull(),
    customerId: varchar('customer_id', { length: 255 }).notNull(),

    // Alert details
    alertType: varchar('alert_type', { length: 50 }).notNull(),
    severity: varchar('severity', { length: 10 }).notNull(),

    // Cost metrics (for cost_spike and cost_and_quality alerts)
    currentCost: doublePrecision('current_cost'),
    baselineCost: doublePrecision('baseline_cost'),
    costIncreasePercent: doublePrecision('cost_increase_percent'),

    // Quality metrics (for quality_drop and cost_and_quality alerts)
    hashSimilarity: doublePrecision('hash_similarity'),
    semanticScore: doublePrecision('semantic_score'),
    scoringMethod: varchar('scoring_method', { length: 20 }),
    semanticCached: boolean('semantic_cached').default(false),

    // Service context
    serviceName: varchar('service_name', { length: 255 }).notNull(),
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    model: varchar('model', { length: 255 }),

    // Alert metadata
    reasoning: text('reasoning'),

    // Timestamps
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),

    // Alert state
    status: varchar('status', { length: 20 }).default('pending'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true, mode: 'date' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    // Composite foreign key to traces
    traceFk: foreignKey({
      columns: [table.traceId, table.spanId],
      foreignColumns: [traces.traceId, traces.spanId],
      name: 'alerts_trace_fk',
    }).onDelete('cascade'),

    // Indexes for common alert queries
    customerTimestampIdx: index('idx_alerts_customer_timestamp').on(
      table.customerId,
      sql`${table.timestamp} DESC`
    ),
    customerStatusIdx: index('idx_alerts_customer_status').on(table.customerId, table.status),
    customerTypeIdx: index('idx_alerts_customer_type').on(table.customerId, table.alertType),
    severityIdx: index('idx_alerts_severity')
      .on(table.severity)
      .where(sql`${table.status} = 'pending'`),
    traceIdx: index('idx_alerts_trace').on(table.traceId, table.spanId),
    serviceIdx: index('idx_alerts_service').on(table.serviceName, table.endpoint),

    // CHECK constraints
    alertTypeCheck: check(
      'alerts_alert_type_check',
      sql`${table.alertType} IN ('cost_spike', 'quality_drop', 'latency_spike', 'cost_and_quality')`
    ),
    severityCheck: check(
      'alerts_severity_check',
      sql`${table.severity} IN ('LOW', 'MEDIUM', 'HIGH')`
    ),
    scoringMethodCheck: check(
      'alerts_scoring_method_check',
      sql`${table.scoringMethod} IN ('hash_only', 'semantic', 'both')`
    ),
    statusCheck: check(
      'alerts_status_check',
      sql`${table.status} IN ('pending', 'sent', 'acknowledged', 'resolved')`
    ),
  })
);

// TypeScript types inferred from schema
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
