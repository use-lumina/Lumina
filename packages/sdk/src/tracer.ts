import type { SdkConfig } from '@lumina/config';
import type { Trace } from '@lumina/schema';
import { HttpExporter } from './exporter';
import { generateTraceId, hashResponse } from './utils';

/**
 * Tracer
 * Captures and records LLM calls as traces
 */
export class Tracer {
  private config: SdkConfig;
  private exporter: HttpExporter;

  constructor(config: SdkConfig, exporter: HttpExporter) {
    this.config = config;
    this.exporter = exporter;
  }

  /**
   * Trace a function execution
   * Automatically captures timing, errors, and metadata
   */
  async trace<T>(
    fn: () => Promise<T>,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const traceId = generateTraceId();

    try {
      const result = await fn();
      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      // Extract trace data from result if it's an LLM response
      // This is a basic implementation - auto-instrumentation will enhance this
      await this.captureFromResult(result, traceId, latencyMs, options);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      // Create error trace
      await this.createErrorTrace(traceId, error, latencyMs, options);

      throw error;
    }
  }

  /**
   * Manually create a trace
   */
  async createTrace(data: {
    prompt: string;
    response: string;
    model: string;
    tokens: number;
    latency_ms: number;
    cost_usd: number;
    service_name?: string;
    endpoint?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const trace: Trace = {
      trace_id: generateTraceId(),
      span_id: generateTraceId(), // Generate unique span ID
      customer_id: '', // Will be filled by ingestion service from API key
      timestamp: new Date(),
      service_name: data.service_name || this.detectServiceName(),
      endpoint: data.endpoint || '/unknown',
      environment: this.config.environment,
      model: data.model,
      prompt: data.prompt,
      response: data.response,
      response_hash: hashResponse(data.response),
      tokens: data.tokens,
      latency_ms: data.latency_ms,
      cost_usd: data.cost_usd,
      metadata: data.metadata,
      tags: data.tags,
      status: 'success',
    };

    await this.exporter.export(trace);
  }

  /**
   * Capture trace data from function result
   * This is enhanced by auto-instrumentation for specific libraries
   */
  private async captureFromResult(
    result: unknown,
    traceId: string,
    latencyMs: number,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<void> {
    // Check if result is an OpenAI-like response
    if (this.isLLMResponse(result)) {
      const trace = this.extractTraceFromLLMResponse(result, traceId, latencyMs, options);
      await this.exporter.export(trace);
    }
  }

  /**
   * Check if result looks like an LLM API response
   */
  private isLLMResponse(result: unknown): boolean {
    if (typeof result !== 'object' || result === null) {
      return false;
    }

    const obj = result as Record<string, unknown>;

    // OpenAI response structure
    if (obj.id && obj.model && obj.choices && obj.usage) {
      return true;
    }

    // Anthropic response structure
    if (obj.id && obj.type && obj.content && obj.usage) {
      return true;
    }

    return false;
  }

  /**
   * Extract trace from LLM API response
   */
  private extractTraceFromLLMResponse(
    response: unknown,
    traceId: string,
    latencyMs: number,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Trace {
    const obj = response as Record<string, any>;

    // Extract common fields
    const model = obj.model || 'unknown';
    const prompt = '';
    let responseText = '';
    let tokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    // Handle OpenAI format
    if (obj.choices) {
      responseText = obj.choices[0]?.message?.content || obj.choices[0]?.text || '';
      tokens = obj.usage?.total_tokens || 0;
      promptTokens = obj.usage?.prompt_tokens || 0;
      completionTokens = obj.usage?.completion_tokens || 0;
    }

    // Handle Anthropic format
    if (obj.content && Array.isArray(obj.content)) {
      responseText = obj.content.map((c: any) => c.text).join('') || '';
      tokens = obj.usage?.input_tokens + obj.usage?.output_tokens || 0;
      promptTokens = obj.usage?.input_tokens || 0;
      completionTokens = obj.usage?.output_tokens || 0;
    }

    // Calculate cost (basic estimation)
    const costUsd = this.estimateCost(model, promptTokens, completionTokens);

    const trace: Trace = {
      trace_id: traceId,
      span_id: generateTraceId(), // Generate unique span ID
      customer_id: '', // Filled by ingestion service
      timestamp: new Date(),
      service_name: this.detectServiceName(),
      endpoint: options?.name || '/api/chat',
      environment: this.config.environment,
      model,
      prompt,
      response: responseText,
      response_hash: hashResponse(responseText),
      tokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      cost_usd: costUsd,
      metadata: options?.metadata,
      tags: options?.tags,
      status: 'success',
    };

    return trace;
  }

  /**
   * Create an error trace
   */
  private async createErrorTrace(
    traceId: string,
    error: unknown,
    latencyMs: number,
    options?: {
      name?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const trace: Trace = {
      trace_id: traceId,
      span_id: generateTraceId(), // Generate unique span ID
      customer_id: '',
      timestamp: new Date(),
      service_name: this.detectServiceName(),
      endpoint: options?.name || '/unknown',
      environment: this.config.environment,
      model: 'unknown',
      prompt: '',
      response: '',
      tokens: 0,
      latency_ms: latencyMs,
      cost_usd: 0,
      metadata: options?.metadata,
      tags: options?.tags,
      status: 'error',
      error_message: errorMessage,
    };

    await this.exporter.export(trace);
  }

  /**
   * Detect service name from environment
   */
  private detectServiceName(): string {
    // Try to detect from common environment variables
    return (
      process.env.SERVICE_NAME ||
      process.env.APP_NAME ||
      process.env.VERCEL_PROJECT_NAME ||
      'unknown-service'
    );
  }

  /**
   * Estimate cost based on model and tokens
   * This is a basic implementation - will be enhanced with accurate pricing
   */
  private estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Simplified pricing (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
    };

    // Find matching pricing
    const modelKey = Object.keys(pricing).find((key) => model.includes(key));
    const prices = (modelKey ? pricing[modelKey] : { input: 1, output: 2 }) as {
      input: number;
      output: number;
    };

    const inputCost = (promptTokens / 1_000_000) * prices.input;
    const outputCost = (completionTokens / 1_000_000) * prices.output;

    return inputCost + outputCost;
  }
}
