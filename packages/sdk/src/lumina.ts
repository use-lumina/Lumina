import { loadSdkConfig, type SdkConfig } from '@lumina/config';
import { SpanStatusCode, type Span, type Tracer as OtelTracer } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import * as SemanticConventions from './semantic-conventions';

/**
 * Main Lumina SDK class - OpenTelemetry-native LLM observability
 *
 * This SDK uses OpenTelemetry as its foundation, making it:
 * - Compatible with existing OTEL infrastructure
 * - Vendor-agnostic and future-proof
 * - Integratable with Datadog, Grafana, etc.
 */
export class Lumina {
  private config: SdkConfig;
  private provider: NodeTracerProvider;
  private tracer: OtelTracer;
  private static instance: Lumina | null = null;

  constructor(config?: Partial<SdkConfig>) {
    // Load config from environment and merge with provided config
    const envConfig = this.loadConfigSafely();
    this.config = { ...envConfig, ...config } as SdkConfig;

    // API key is optional for self-hosted deployments
    // If not provided, requests will be sent without Authorization header
    // and treated as self-hosted (customerId='default')

    // Initialize OpenTelemetry provider
    this.provider = this.initializeProvider();
    this.tracer = this.provider.getTracer('@lumina/sdk', '1.0.0');

    // Store singleton instance
    Lumina.instance = this;
  }

  /**
   * Initialize OTEL TracerProvider with Lumina exporter
   */
  private initializeProvider(): NodeTracerProvider {
    // Create resource with service information
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this.config.service_name || 'unknown-service',
        [ATTR_SERVICE_VERSION]: '1.0.0',
        [SemanticConventions.LUMINA_CUSTOMER_ID]: this.config.customer_id || '',
        [SemanticConventions.LUMINA_ENVIRONMENT]: this.config.environment,
      })
    );

    // Create OTLP exporter pointing to Lumina collector
    // Note: OTLPTraceExporter expects full URL including path
    const headers: Record<string, string> = {};

    // Only add Authorization header if API key is provided
    // For self-hosted deployments, no API key = no auth header
    if (this.config.api_key) {
      headers.Authorization = `Bearer ${this.config.api_key}`;
    }

    const exporter = new OTLPTraceExporter({
      url: this.config.endpoint,
      headers,
    });

    // Create batch span processor for efficient batching
    const spanProcessor = new BatchSpanProcessor(exporter, {
      maxQueueSize: this.config.batch_size || 10,
      scheduledDelayMillis: this.config.flush_interval_ms || 5000,
      exportTimeoutMillis: this.config.timeout_ms || 30000,
      maxExportBatchSize: this.config.batch_size || 10,
    });

    // Create tracer provider with resource and span processor
    const provider = new NodeTracerProvider({
      resource,
      spanProcessors: [spanProcessor],
    });

    // Register the provider
    provider.register();

    return provider;
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
   * Trace an LLM operation using OpenTelemetry spans
   *
   * This creates an OTEL span with LLM semantic conventions,
   * making it compatible with standard observability tools.
   *
   * @example
   * const response = await lumina.trace(async (span) => {
   *   const result = await openai.chat.completions.create({...});
   *
   *   // Enrich span with LLM metadata
   *   span.setAttributes({
   *     [SemanticConventions.LLM_REQUEST_MODEL]: 'gpt-4',
   *     [SemanticConventions.LLM_USAGE_PROMPT_TOKENS]: result.usage.prompt_tokens,
   *   });
   *
   *   return result;
   * }, { name: 'chat-completion' });
   */
  async trace<T>(
    fn: (span: Span) => Promise<T>,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<T> {
    const spanName = options?.name || SemanticConventions.SPAN_NAME_LLM_REQUEST;

    return await this.tracer.startActiveSpan(spanName, async (span: Span) => {
      const startTime = Date.now();

      try {
        // Add custom metadata as span attributes
        if (options?.metadata) {
          for (const [key, value] of Object.entries(options.metadata)) {
            span.setAttribute(key, JSON.stringify(value));
          }
        }

        // Add tags
        if (options?.tags) {
          span.setAttribute(SemanticConventions.LUMINA_TAGS, JSON.stringify(options.tags));
        }

        // Add Lumina-specific attributes
        span.setAttribute(SemanticConventions.LUMINA_ENVIRONMENT, this.config.environment);
        if (this.config.service_name) {
          span.setAttribute(SemanticConventions.LUMINA_SERVICE_NAME, this.config.service_name);
        }

        // Execute the traced function, passing the span for enrichment
        const result = await fn(span);

        // Calculate latency
        const latencyMs = Date.now() - startTime;
        span.setAttribute('duration_ms', latencyMs);

        // Mark span as successful
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        // Record error in span
        const errorMessage = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });

        throw error;
      } finally {
        // End the span
        span.end();
      }
    });
  }

  /**
   * Create a span for LLM generation with automatic attribute extraction
   *
   * This is a convenience wrapper that automatically extracts common LLM attributes
   * from the response object.
   */
  async traceLLM<T extends { model?: string; usage?: any; id?: string }>(
    fn: () => Promise<T>,
    options?: {
      name?: string;
      system?: string; // e.g., 'openai', 'anthropic'
      prompt?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<T> {
    return await this.trace(async (span) => {
      // Add LLM-specific attributes before the call
      if (options?.system) {
        span.setAttribute(SemanticConventions.LLM_SYSTEM, options.system);
      }
      if (options?.prompt) {
        span.setAttribute(SemanticConventions.LLM_PROMPT, options.prompt);
      }

      // Execute the LLM call
      const result = await fn();

      // Extract and add response attributes
      if (result.model) {
        span.setAttribute(SemanticConventions.LLM_RESPONSE_MODEL, result.model);
      }
      if (result.id) {
        span.setAttribute(SemanticConventions.LLM_RESPONSE_ID, result.id);
      }

      // Extract completion/response text
      // Handle both OpenAI and Anthropic response formats
      let completion = '';
      if ('choices' in result && Array.isArray(result.choices)) {
        // OpenAI format: result.choices[0].message.content
        completion = (result as any).choices[0]?.message?.content || '';
      } else if ('content' in result) {
        if (Array.isArray(result.content)) {
          // Anthropic format: result.content[0].text
          const firstContent = (result as any).content[0];
          if (firstContent && firstContent.type === 'text') {
            completion = firstContent.text || '';
          }
        } else if (typeof result.content === 'string') {
          // Simple string content format
          completion = result.content;
        }
      }

      if (completion) {
        span.setAttribute(SemanticConventions.LLM_COMPLETION, completion);
      }

      if (result.usage) {
        // Support both OpenAI (prompt_tokens/completion_tokens) and Anthropic (input_tokens/output_tokens) naming
        const promptTokens = result.usage.prompt_tokens || result.usage.input_tokens;
        const completionTokens = result.usage.completion_tokens || result.usage.output_tokens;
        const totalTokens =
          result.usage.total_tokens || (promptTokens || 0) + (completionTokens || 0);

        if (promptTokens) {
          span.setAttribute(SemanticConventions.LLM_USAGE_PROMPT_TOKENS, promptTokens);
        }
        if (completionTokens) {
          span.setAttribute(SemanticConventions.LLM_USAGE_COMPLETION_TOKENS, completionTokens);
        }
        if (totalTokens) {
          span.setAttribute(SemanticConventions.LLM_USAGE_TOTAL_TOKENS, totalTokens);
        }

        // Calculate cost if we have token usage
        const cost = this.calculateCost(
          result.model || '',
          promptTokens || 0,
          completionTokens || 0
        );
        if (cost > 0) {
          span.setAttribute(SemanticConventions.LUMINA_COST_USD, cost);
        }
      }

      return result;
    }, options);
  }

  /**
   * Calculate cost based on model and token usage
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Pricing per 1M tokens
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-sonnet-4': { input: 3, output: 15 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
    };

    const modelKey = Object.keys(pricing).find((key) => model.includes(key));
    const prices = modelKey ? pricing[modelKey] : { input: 1, output: 2 };

    const inputCost = (promptTokens / 1_000_000) * prices!.input;
    const outputCost = (completionTokens / 1_000_000) * prices!.output;

    return inputCost + outputCost;
  }

  /**
   * Flush all pending spans immediately
   */
  async flush(): Promise<void> {
    await this.provider.forceFlush();
  }

  /**
   * Shutdown the SDK and flush remaining spans
   */
  async shutdown(): Promise<void> {
    await this.provider.shutdown();
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

  /**
   * Get the OpenTelemetry tracer instance for advanced use cases
   */
  getTracer(): OtelTracer {
    return this.tracer;
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
 *   api_key: process.env.LUMINA_API_KEY,
 *   endpoint: 'https://collector.lumina.app/v1/traces',
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
