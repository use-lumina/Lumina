import {
  IngestionConfigSchema,
  ApiConfigSchema,
  ReplayConfigSchema,
  SdkConfigSchema,
  type IngestionConfig,
  type ApiConfig,
  type ReplayConfig,
  type SdkConfig,
} from './config';

/**
 * Load and validate Ingestion Service configuration from environment variables
 */
export function loadIngestionConfig(): IngestionConfig {
  const config = {
    service_name: process.env.SERVICE_NAME || 'lumina-ingestion',
    server: {
      port: parseInt(process.env.INGESTION_PORT || '8080', 10),
      host: process.env.HOST || '0.0.0.0',
      cors_origin: process.env.CORS_ORIGIN || '*',
      log_level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
    database: {
      duckdb_path: process.env.DUCKDB_PATH || './data/lumina.db',
      max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      query_timeout_ms: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
    },
    nats: {
      url: process.env.NATS_URL || 'nats://localhost:4222',
      stream_name: process.env.NATS_STREAM || 'lumina-traces',
      consumer_name: process.env.NATS_CONSUMER || 'lumina-ingestion-consumer',
      max_retries: parseInt(process.env.NATS_MAX_RETRIES || '3', 10),
    },
    auth: {
      jwt_secret: process.env.JWT_SECRET,
      jwt_expiry: process.env.JWT_EXPIRY || '24h',
      api_key_cache_ttl_seconds: parseInt(process.env.API_KEY_CACHE_TTL || '300', 10),
    },
    webhooks: {
      slack_webhook_url: process.env.SLACK_WEBHOOK_URL,
      discord_webhook_url: process.env.DISCORD_WEBHOOK_URL,
      pagerduty_api_key: process.env.PAGERDUTY_API_KEY,
      webhook_timeout_ms: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
      webhook_retry_attempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED !== 'false',
      cost_spike_threshold_percent: parseFloat(process.env.COST_SPIKE_THRESHOLD_PERCENT || '20'),
      quality_score_threshold: parseFloat(process.env.QUALITY_SCORE_THRESHOLD || '0.7'),
      latency_spike_threshold_percent: parseFloat(
        process.env.LATENCY_SPIKE_THRESHOLD_PERCENT || '50'
      ),
      baseline_window: (process.env.BASELINE_WINDOW || '24h') as '1h' | '24h' | '7d',
      baseline_calculation_interval_ms: parseInt(
        process.env.BASELINE_CALCULATION_INTERVAL_MS || '300000',
        10
      ),
    },
  };

  // Validate with Zod
  const validated = IngestionConfigSchema.parse(config);
  return validated;
}

/**
 * Load and validate API Service configuration from environment variables
 */
export function loadApiConfig(): ApiConfig {
  const config = {
    service_name: process.env.SERVICE_NAME || 'lumina-api',
    server: {
      port: parseInt(process.env.API_PORT || '8081', 10),
      host: process.env.HOST || '0.0.0.0',
      cors_origin: process.env.CORS_ORIGIN || '*',
      log_level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
    database: {
      duckdb_path: process.env.DUCKDB_PATH || './data/lumina.db',
      max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      query_timeout_ms: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
    },
    auth: {
      jwt_secret: process.env.JWT_SECRET,
      jwt_expiry: process.env.JWT_EXPIRY || '24h',
      api_key_cache_ttl_seconds: parseInt(process.env.API_KEY_CACHE_TTL || '300', 10),
    },
  };

  const validated = ApiConfigSchema.parse(config);
  return validated;
}

/**
 * Load and validate Replay Service configuration from environment variables
 */
export function loadReplayConfig(): ReplayConfig {
  const config = {
    service_name: process.env.SERVICE_NAME || 'lumina-replay',
    server: {
      port: parseInt(process.env.REPLAY_PORT || '8082', 10),
      host: process.env.HOST || '0.0.0.0',
      cors_origin: process.env.CORS_ORIGIN || '*',
      log_level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
    database: {
      duckdb_path: process.env.DUCKDB_PATH || './data/lumina.db',
      max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      query_timeout_ms: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
    },
    auth: {
      jwt_secret: process.env.JWT_SECRET,
      jwt_expiry: process.env.JWT_EXPIRY || '24h',
      api_key_cache_ttl_seconds: parseInt(process.env.API_KEY_CACHE_TTL || '300', 10),
    },
    max_concurrent_replays: parseInt(process.env.MAX_CONCURRENT_REPLAYS || '5', 10),
    replay_timeout_ms: parseInt(process.env.REPLAY_TIMEOUT_MS || '60000', 10),
  };

  const validated = ReplayConfigSchema.parse(config);
  return validated;
}

/**
 * Load and validate SDK configuration from environment variables
 */
export function loadSdkConfig(): SdkConfig {
  const apiKey = process.env.LUMINA_API_KEY;

  if (!apiKey) {
    throw new Error('LUMINA_API_KEY environment variable is required');
  }

  const config = {
    api_key: apiKey,
    endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/ingest',
    environment: (process.env.LUMINA_ENVIRONMENT || 'live') as 'live' | 'test',
    batch_size: parseInt(process.env.LUMINA_BATCH_SIZE || '10', 10),
    batch_interval_ms: parseInt(process.env.LUMINA_BATCH_INTERVAL_MS || '5000', 10),
    max_retries: parseInt(process.env.LUMINA_MAX_RETRIES || '3', 10),
    timeout_ms: parseInt(process.env.LUMINA_TIMEOUT_MS || '10000', 10),
    enabled: process.env.LUMINA_ENABLED !== 'false',
  };

  const validated = SdkConfigSchema.parse(config);
  return validated;
}

/**
 * Validate required environment variables are present
 */
export function validateRequiredEnvVars(required: string[]): void {
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];

  if (!value && !fallback) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }

  return value || fallback!;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(name: string, fallback?: number): number {
  const value = process.env[name];

  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }

  return value ? parseInt(value, 10) : fallback!;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(name: string, fallback?: boolean): boolean {
  const value = process.env[name];

  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }

  if (!value) return fallback!;

  return value.toLowerCase() === 'true' || value === '1';
}
