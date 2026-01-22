// Local config utilities for standalone SDK package
import type { SdkConfig } from './types';

/**
 * Load SDK configuration from environment variables and defaults
 */
export function loadSdkConfig(overrides?: Partial<SdkConfig>): SdkConfig {
  const baseConfig: Partial<SdkConfig> = {
    api_key: process.env.LUMINA_API_KEY,
    endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:9411/v1/traces',
    environment: (process.env.LUMINA_ENVIRONMENT || 'live') as 'live' | 'test',
    service_name: process.env.LUMINA_SERVICE_NAME,
    customer_id: process.env.LUMINA_CUSTOMER_ID,
    enabled: process.env.LUMINA_ENABLED !== 'false',
    batch_size: parseInt(process.env.LUMINA_BATCH_SIZE || '10', 10),
    batch_interval_ms: parseInt(process.env.LUMINA_BATCH_INTERVAL_MS || '5000', 10),
    flush_interval_ms: parseInt(process.env.LUMINA_BATCH_INTERVAL_MS || '5000', 10),
    max_retries: parseInt(process.env.LUMINA_MAX_RETRIES || '3', 10),
    timeout_ms: parseInt(process.env.LUMINA_TIMEOUT_MS || '30000', 10),
  };

  const config: SdkConfig = {
    endpoint: baseConfig.endpoint!,
    environment: (baseConfig.environment || 'live') as 'live' | 'test',
    enabled: baseConfig.enabled !== undefined ? baseConfig.enabled : true,
    batch_size: baseConfig.batch_size || 10,
    batch_interval_ms: baseConfig.batch_interval_ms || 5000,
    timeout_ms: baseConfig.timeout_ms || 30000,
    max_retries: baseConfig.max_retries !== undefined ? baseConfig.max_retries : 3,
    ...baseConfig,
    ...overrides,
  };

  return config;
}

/**
 * Validate SDK configuration
 */
export function validateSdkConfig(config: SdkConfig): void {
  if (config.enabled && !config.endpoint) {
    throw new Error('Lumina SDK: endpoint is required when enabled is true');
  }

  if (config.batch_size && config.batch_size <= 0) {
    throw new Error('Lumina SDK: batch_size must be positive');
  }

  if (config.batch_interval_ms && config.batch_interval_ms <= 0) {
    throw new Error('Lumina SDK: batch_interval_ms must be positive');
  }
}
