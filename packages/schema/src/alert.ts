import { z } from 'zod';

/**
 * Alert Type Enum
 */
export const AlertType = z.enum([
  'cost_spike',
  'quality_drop',
  'cost_and_quality',
  'latency_spike',
]);

export type AlertTypeEnum = z.infer<typeof AlertType>;

/**
 * Alert Severity Enum
 */
export const AlertSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export type AlertSeverityEnum = z.infer<typeof AlertSeverity>;

/**
 * Alert Schema
 * Represents a triggered alert for cost spikes, quality drops, etc.
 */
export const AlertSchema = z.object({
  // Identifiers
  alert_id: z.string().min(1),
  trace_id: z.string().min(1),
  customer_id: z.string().min(1),

  // Timestamps
  timestamp: z.coerce.date(),
  acknowledged_at: z.coerce.date().optional(),

  // Alert classification
  alert_type: AlertType,
  severity: AlertSeverity,

  // Context
  service_name: z.string().min(1),
  endpoint: z.string().min(1),
  model: z.string().optional(),

  // Alert-specific details
  details: z.object({
    // Cost spike details
    current_cost: z.number().nonnegative().optional(),
    baseline_p50: z.number().nonnegative().optional(),
    baseline_p95: z.number().nonnegative().optional(),
    increase_percent: z.number().optional(),

    // Quality drop details
    hash_similarity: z.number().min(0).max(1).optional(),
    semantic_score: z.number().min(0).max(1).optional(),
    final_score: z.number().min(0).max(1).optional(),
    scoring_method: z.enum(['structural', 'semantic']).optional(),
    baseline_count: z.number().int().nonnegative().optional(),

    // Latency spike details
    current_latency_ms: z.number().nonnegative().optional(),
    baseline_p95_latency: z.number().nonnegative().optional(),

    // Tokens
    tokens: z.number().int().nonnegative().optional(),

    // Recommended action
    recommended_action: z.string().optional(),
  }),

  // Status
  status: z.enum(['active', 'acknowledged', 'resolved']).default('active'),
  acknowledged_by: z.string().optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

/**
 * Alert Rule Schema
 * Defines thresholds and conditions for triggering alerts
 */
export const AlertRuleSchema = z.object({
  rule_id: z.string().min(1),
  customer_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),

  // Scope
  service_name: z.string().optional(), // null = all services
  endpoint: z.string().optional(), // null = all endpoints

  // Rule type and thresholds
  rule_type: AlertType,
  enabled: z.boolean().default(true),

  thresholds: z.object({
    // Cost thresholds
    cost_spike_percentage: z.number().positive().optional(), // e.g., 20 = 20% above baseline
    cost_spike_absolute: z.number().positive().optional(), // e.g., $0.10 above baseline

    // Quality thresholds
    quality_score_threshold: z.number().min(0).max(1).optional(), // e.g., 0.7 = alert if below 70%

    // Latency thresholds
    latency_spike_percentage: z.number().positive().optional(),
    latency_spike_absolute_ms: z.number().positive().optional(),
  }),

  // Notification settings
  notification_channels: z
    .array(z.enum(['slack', 'discord', 'pagerduty', 'email', 'webhook']))
    .default(['slack']),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;

/**
 * Webhook Payload Schema
 * Payload sent to Slack, Discord, etc.
 */
export const WebhookPayloadSchema = z.object({
  alert: AlertSchema,
  trace_url: z.string().url(),
  dashboard_url: z.string().url().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
