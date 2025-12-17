import { loadSdkConfig, type SdkConfig } from '@lumina/config';
import { HttpExporter } from './exporter';
import { Tracer } from './tracer';

/**
 * Main Lumina SDK class
 * Entry point for instrumenting AI applications
 */
export class Lumina {
  private config: SdkConfig;
  private exporter: HttpExporter;
  private tracer: Tracer;
  private static instance: Lumina | null = null;

  constructor(config?: Partial<SdkConfig>) {
    // Load config from environment and merge with provided config
    const envConfig = this.loadConfigSafely();
    this.config = { ...envConfig, ...config } as SdkConfig;

    // Validate API key is present
    if (!this.config.api_key) {
      throw new Error(
        'Lumina API key is required. Set LUMINA_API_KEY environment variable or pass apiKey in constructor.'
      );
    }

    // Initialize exporter and tracer
    this.exporter = new HttpExporter(this.config);
    this.tracer = new Tracer(this.config, this.exporter);

    // Store singleton instance
    Lumina.instance = this;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): Lumina | null {
    return Lumina.instance;
  }

  /**
   * Load config safely (don't throw if env vars missing)
   */
  private loadConfigSafely(): Partial<SdkConfig> {
    try {
      return loadSdkConfig();
    } catch {
      // If env vars not set, return empty object
      // Constructor config will be required
      return {};
    }
  }

  /**
   * Trace a function that makes LLM calls
   * Automatically captures inputs, outputs, latency, and costs
   *
   * @example
   * const response = await lumina.trace(async () => {
   *   return await openai.chat.completions.create({...});
   * });
   */
  async trace<T>(
    fn: () => Promise<T>,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<T> {
    return this.tracer.trace(fn, options);
  }

  /**
   * Manually create a trace (for advanced use cases)
   */
  async createTrace(data: {
    prompt: string;
    response: string;
    model: string;
    tokens: number;
    latency_ms: number;
    cost_usd: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<void> {
    await this.tracer.createTrace(data);
  }

  /**
   * Flush all pending traces immediately
   */
  async flush(): Promise<void> {
    await this.exporter.flush();
  }

  /**
   * Shutdown the SDK and flush remaining traces
   */
  async shutdown(): Promise<void> {
    await this.exporter.shutdown();
  }

  /**
   * Check if SDK is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): SdkConfig {
    return { ...this.config };
  }
}

/**
 * Initialize Lumina SDK with configuration
 * This is the primary way to set up the SDK
 *
 * @example
 * import { initLumina } from '@lumina/sdk';
 *
 * const lumina = initLumina({
 *   apiKey: process.env.LUMINA_API_KEY,
 *   endpoint: 'https://ingestion.lumina.app/ingest',
 * });
 */
export function initLumina(config?: Partial<SdkConfig>): Lumina {
  return new Lumina(config);
}

/**
 * Get the current Lumina instance (if initialized)
 */
export function getLumina(): Lumina | null {
  return Lumina.getInstance();
}
