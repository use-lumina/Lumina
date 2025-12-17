import { z } from 'zod';

/**
 * Database Configuration Schema
 */
export const DatabaseConfigSchema = z.object({
  duckdb_path: z.string().default('./data/lumina.db'),
  max_connections: z.number().int().positive().default(10),
  query_timeout_ms: z.number().int().positive().default(30000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * NATS Configuration Schema
 */
export const NatsConfigSchema = z.object({
  url: z.string().url().default('nats://localhost:4222'),
  stream_name: z.string().default('lumina-traces'),
  consumer_name: z.string().default('lumina-ingestion-consumer'),
  max_retries: z.number().int().nonnegative().default(3),
});

export type NatsConfig = z.infer<typeof NatsConfigSchema>;

/**
 * Server Configuration Schema
 */
export const ServerConfigSchema = z.object({
  port: z.number().int().positive().default(8080),
  host: z.string().default('0.0.0.0'),
  cors_origin: z.string().default('*'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Authentication Configuration Schema
 */
export const AuthConfigSchema = z.object({
  jwt_secret: z.string().min(32).optional(),
  jwt_expiry: z.string().default('24h'),
  api_key_cache_ttl_seconds: z.number().int().positive().default(300), // 5 minutes
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * Webhook Configuration Schema
 */
export const WebhookConfigSchema = z.object({
  slack_webhook_url: z.string().url().optional(),
  discord_webhook_url: z.string().url().optional(),
  pagerduty_api_key: z.string().optional(),
  webhook_timeout_ms: z.number().int().positive().default(5000),
  webhook_retry_attempts: z.number().int().nonnegative().default(3),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

/**
 * Alert Configuration Schema
 */
export const AlertConfigSchema = z.object({
  enabled: z.boolean().default(true),
  cost_spike_threshold_percent: z.number().positive().default(20), // 20% above baseline
  quality_score_threshold: z.number().min(0).max(1).default(0.7), // Alert if below 70%
  latency_spike_threshold_percent: z.number().positive().default(50), // 50% above baseline
  baseline_window: z.enum(['1h', '24h', '7d']).default('24h'),
  baseline_calculation_interval_ms: z.number().int().positive().default(300000), // 5 minutes
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

/**
 * Ingestion Service Configuration
 */
export const IngestionConfigSchema = z.object({
  service_name: z.string().default('lumina-ingestion'),
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  nats: NatsConfigSchema,
  auth: AuthConfigSchema,
  webhooks: WebhookConfigSchema,
  alerts: AlertConfigSchema,
});

export type IngestionConfig = z.infer<typeof IngestionConfigSchema>;

/**
 * API Service Configuration
 */
export const ApiConfigSchema = z.object({
  service_name: z.string().default('lumina-api'),
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * Replay Service Configuration
 */
export const ReplayConfigSchema = z.object({
  service_name: z.string().default('lumina-replay'),
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
  max_concurrent_replays: z.number().int().positive().default(5),
  replay_timeout_ms: z.number().int().positive().default(60000), // 1 minute per replay
});

export type ReplayConfig = z.infer<typeof ReplayConfigSchema>;

/**
 * SDK Configuration Schema
 */
export const SdkConfigSchema = z.object({
  api_key: z.string().min(1),
  endpoint: z.string().url().default('http://localhost:8080/ingest'),
  environment: z.enum(['live', 'test']).default('live'),
  batch_size: z.number().int().positive().default(10),
  batch_interval_ms: z.number().int().positive().default(5000), // 5 seconds
  max_retries: z.number().int().nonnegative().default(3),
  timeout_ms: z.number().int().positive().default(10000),
  enabled: z.boolean().default(true),
});

export type SdkConfig = z.infer<typeof SdkConfigSchema>;

/**
 * Environment Detection
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'test') return 'test';
  return 'development';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}
