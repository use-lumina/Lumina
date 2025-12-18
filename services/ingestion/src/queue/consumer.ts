import { getNATSConnection } from './nats-client';
import { getDB } from '../database/postgres';
import { analyzeTrace, calculateBaseline } from '@lumina/core';
import type { Trace } from '@lumina/schema';
import { AckPolicy, DeliverPolicy, type JsMsg } from 'nats';

const SUBJECT = 'traces.ingest';
const STREAM_NAME = 'TRACES';
const CONSUMER_NAME = 'alert-processor';

/**
 * Start the NATS consumer for processing traces and generating alerts
 */
export async function startConsumer(): Promise<void> {
  const nc = getNATSConnection();
  if (!nc) {
    console.error('❌ NATS connection not available - consumer cannot start');
    return;
  }

  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  try {
    // Get or create consumer
    let consumer;
    try {
      consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);
      console.log(`✅ NATS consumer "${CONSUMER_NAME}" found`);
    } catch (error: any) {
      if (error.api_error?.err_code === 10014 || error.message?.includes('consumer not found')) {
        // Create the consumer if it doesn't exist using JetStreamManager
        await jsm.consumers.add(STREAM_NAME, {
          durable_name: CONSUMER_NAME,
          ack_policy: AckPolicy.Explicit,
          deliver_policy: DeliverPolicy.All,
          filter_subjects: [SUBJECT],
        });
        console.log(`✅ Created NATS consumer "${CONSUMER_NAME}"`);
        // Now get the consumer
        consumer = await js.consumers.get(STREAM_NAME, CONSUMER_NAME);
      } else {
        throw error;
      }
    }

    console.log(`✅ NATS consumer "${CONSUMER_NAME}" connected to stream "${STREAM_NAME}"`);

    // Start consuming messages
    const messages = await consumer.consume();
    console.log(`🔄 Started processing traces from ${SUBJECT}...`);

    // Process messages
    for await (const msg of messages) {
      await processTraceMessage(msg);
    }
  } catch (error) {
    console.error('❌ Failed to start NATS consumer:', error);
    throw error;
  }
}

/**
 * Process a single trace message from NATS
 */
async function processTraceMessage(msg: JsMsg): Promise<void> {
  const processingStart = Date.now();

  try {
    // Parse trace from message
    const trace: Trace = JSON.parse(msg.string());
    const customerId: string = trace.customer_id;

    console.log(`📥 Processing trace ${trace.trace_id} for customer ${customerId}`);

    // Get database connection
    const db = getDB();

    // Fetch baseline data for this service
    // Use last 7 days of data for baseline calculation
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baselineTraces = await db.traces.queryTraces({
      customerId,
      serviceName: trace.service_name,
      startTime,
      endTime,
      status: 'success',
      limit: 1000, // Last 1000 traces for baseline
      offset: 0,
    });

    console.log(
      `📊 Found ${baselineTraces.length} baseline traces for ${trace.service_name}:${trace.endpoint}`
    );

    // Skip alert analysis if no baseline data
    if (baselineTraces.length === 0) {
      console.log(`⏭️  Skipping alert analysis - no baseline data available`);
      msg.ack();
      return;
    }

    // Filter baseline traces for same endpoint
    const endpointBaseline = baselineTraces.filter((t) => t.endpoint === trace.endpoint);

    if (endpointBaseline.length === 0) {
      console.log(`⏭️  Skipping alert analysis - no baseline data for endpoint ${trace.endpoint}`);
      msg.ack();
      return;
    }

    // Calculate baseline statistics from historical traces
    const baseline = calculateBaseline(
      trace.service_name,
      trace.endpoint,
      endpointBaseline.map((t) => ({
        costUsd: t.cost_usd || 0,
        timestamp: new Date(t.timestamp),
      })),
      '7d'
    );

    console.log(
      `📈 Baseline calculated: P50=${baseline.p50Cost.toFixed(4)}, P95=${baseline.p95Cost.toFixed(4)}, P99=${baseline.p99Cost.toFixed(4)} (${baseline.sampleCount} samples)`
    );

    // Run hybrid alert analysis
    const alerts = await analyzeTrace({
      traceId: trace.trace_id,
      serviceName: trace.service_name,
      endpoint: trace.endpoint,
      model: trace.model || '',
      prompt: trace.prompt || '',
      response: trace.response || '',
      costUsd: trace.cost_usd || 0,
      baseline,
    });

    if (alerts.length > 0) {
      console.log(`🚨 Generated ${alerts.length} alert(s) for trace ${trace.trace_id}`);

      // Store alerts in database
      await db.alerts.insertBatch(
        alerts.map((alert) => ({
          alert,
          customerId,
          spanId: trace.span_id,
        }))
      );

      // Log alert details
      for (const alert of alerts) {
        console.log(
          `  - ${alert.alertType} (${alert.severity}): ${alert.details.reasoning || 'No reasoning provided'}`
        );
      }
    } else {
      console.log(`✅ No alerts generated for trace ${trace.trace_id}`);
    }

    // Acknowledge message
    msg.ack();

    const processingTime = Date.now() - processingStart;
    console.log(`⏱️  Processed trace ${trace.trace_id} in ${processingTime}ms`);
  } catch (error) {
    console.error('❌ Error processing trace message:', error);

    // Check if we should retry or nack
    const deliveryAttempts = msg.info.deliveryCount;

    if (deliveryAttempts >= 3) {
      // After 3 retries, terminate the message
      console.error(`⚠️  Message exceeded max retries (${deliveryAttempts}), terminating...`);
      msg.term();
    } else {
      // Nack with delay to retry later
      console.log(`🔄 Nacking message for retry (attempt ${deliveryAttempts + 1}/3)...`);
      msg.nak(5000); // Retry after 5 seconds
    }
  }
}

/**
 * Gracefully stop the consumer
 */
export async function stopConsumer(): Promise<void> {
  const nc = getNATSConnection();
  if (!nc) {
    return;
  }

  try {
    // Drain connection to gracefully close
    await nc.drain();
    console.log('✅ NATS consumer stopped gracefully');
  } catch (error) {
    console.error('❌ Error stopping consumer:', error);
  }
}
