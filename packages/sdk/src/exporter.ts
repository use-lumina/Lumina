import type { SdkConfig, Trace, IngestRequest, IngestResponse } from './types';

/**
 * HTTP Exporter
 * Handles batching and sending traces to the ingestion service
 */
export class HttpExporter {
  private config: SdkConfig;
  private batch: Trace[] = [];
  private batchTimer: Timer | null = null;
  private isShuttingDown = false;

  constructor(config: SdkConfig) {
    this.config = config;
    this.startBatchTimer();
  }

  /**
   * Add a trace to the batch
   */
  async export(trace: Trace): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.isShuttingDown) {
      console.warn('[Lumina SDK] Cannot export trace: SDK is shutting down');
      return;
    }

    this.batch.push(trace);

    // If batch is full, flush immediately
    if (this.batch.length >= this.config.batch_size) {
      await this.flush();
    }
  }

  /**
   * Flush all pending traces immediately
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    const traces = [...this.batch];
    this.batch = [];

    try {
      await this.sendBatch(traces);
    } catch (error) {
      console.error('[Lumina SDK] Failed to flush traces:', error);
      // Re-add traces to batch for retry (with limit)
      if (this.batch.length < this.config.batch_size * 2) {
        this.batch.push(...traces);
      }
    }
  }

  /**
   * Send a batch of traces to the ingestion service
   */
  private async sendBatch(traces: Trace[], retryCount = 0): Promise<void> {
    const payload: IngestRequest = {
      traces,
    };

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.api_key}`,
          'User-Agent': 'lumina-sdk-typescript/0.1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout_ms),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as IngestResponse;

      if (!result.success) {
        console.error('[Lumina SDK] Ingestion failed:', result.errors);
      }
    } catch (error) {
      if (retryCount < this.config.max_retries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendBatch(traces, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Start the batch timer for periodic flushing
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush().catch((error) => {
          console.error('[Lumina SDK] Auto-flush failed:', error);
        });
      }
    }, this.config.batch_interval_ms);
  }

  /**
   * Stop the batch timer
   */
  private stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Shutdown the exporter and flush remaining traces
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopBatchTimer();
    await this.flush();
  }
}
