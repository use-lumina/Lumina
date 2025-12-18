/**
 * NATS JetStream client for async trace processing
 * Handles message publishing and consumption with persistence
 */

import { connect, type NatsConnection, type JetStreamClient, StreamConfig } from 'nats';

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;
let isConnected = false;

// Stream and subject configuration
export const STREAM_NAME = 'TRACES';
export const SUBJECT_TRACES = 'traces.ingest';

/**
 * Initialize NATS connection and JetStream
 */
export async function initializeNATS(natsUrl?: string): Promise<void> {
  if (nc && isConnected) {
    console.log('✓ NATS already connected');
    return;
  }

  const url = natsUrl || process.env.NATS_URL || 'nats://localhost:4222';

  try {
    // Connect to NATS
    nc = await connect({
      servers: url,
      reconnect: true,
      maxReconnectAttempts: -1, // Infinite retries
      reconnectTimeWait: 1000, // 1 second between retries
    });

    console.log(`✓ Connected to NATS at ${url}`);

    // Get JetStream client
    js = nc.jetstream();

    // Create or update stream configuration
    await ensureStream();

    isConnected = true;

    // Handle connection lifecycle
    (async () => {
      for await (const status of nc!.status()) {
        console.log(`NATS status: ${status.type} - ${status.data || ''}`);
        if (status.type === 'disconnect') {
          isConnected = false;
        } else if (status.type === 'reconnect') {
          isConnected = true;
        }
      }
    })();

    // Handle connection closure
    (async () => {
      await nc!.closed();
      isConnected = false;
      console.log('NATS connection closed');
    })();
  } catch (error) {
    console.error('Failed to connect to NATS:', error);
    nc = null;
    js = null;
    isConnected = false;
    throw error;
  }
}

/**
 * Ensure JetStream stream exists with proper configuration
 */
async function ensureStream(): Promise<void> {
  if (!nc) throw new Error('NATS not initialized');

  const jsm = await nc.jetstreamManager();

  const streamConfig: Partial<StreamConfig> = {
    name: STREAM_NAME,
    subjects: [`${SUBJECT_TRACES}`],
    retention: 'limits', // Delete old messages when limits reached
    max_age: 24 * 60 * 60 * 1e9, // 24 hours in nanoseconds
    max_msgs: 1_000_000, // Max 1M messages
    max_bytes: 1024 * 1024 * 1024, // 1GB
    storage: 'file', // Persist to disk
    num_replicas: 1, // Single node for now
    discard: 'old', // Discard oldest messages when full
  };

  try {
    // Try to update existing stream
    await jsm.streams.update(STREAM_NAME, streamConfig);
    console.log(`Updated JetStream stream: ${STREAM_NAME}`);
  } catch (error: any) {
    if (error.message?.includes('stream not found')) {
      // Create new stream
      await jsm.streams.add(streamConfig);
      console.log(`Created JetStream stream: ${STREAM_NAME}`);
    } else {
      throw error;
    }
  }
}

/**
 * Publish trace data to NATS for async processing
 */
export async function publishTrace(trace: any): Promise<void> {
  if (!js || !isConnected) {
    throw new Error('NATS JetStream not connected');
  }

  const payload = JSON.stringify(trace);
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  try {
    const ack = await js.publish(SUBJECT_TRACES, data);
    console.log(`Published trace ${trace.trace_id} to NATS (seq: ${ack.seq})`);
  } catch (error) {
    console.error('Failed to publish trace to NATS:', error);
    throw error;
  }
}

/**
 * Publish multiple traces in batch
 */
export async function publishTraces(traces: any[]): Promise<void> {
  if (!js || !isConnected) {
    throw new Error('NATS JetStream not connected');
  }

  const encoder = new TextEncoder();

  try {
    // Publish all traces in parallel
    const promises = traces.map((trace) => {
      const payload = JSON.stringify(trace);
      const data = encoder.encode(payload);
      return js!.publish(SUBJECT_TRACES, data);
    });

    const acks = await Promise.all(promises);
    console.log(
      `Published ${traces.length} traces to NATS (seqs: ${acks[0].seq}-${acks[acks.length - 1].seq})`
    );
  } catch (error) {
    console.error('Failed to publish traces batch to NATS:', error);
    throw error;
  }
}

/**
 * Get NATS connection (for consumer)
 */
export function getNATSConnection(): NatsConnection {
  if (!nc || !isConnected) {
    throw new Error('NATS not connected');
  }
  return nc;
}

/**
 * Get JetStream client (for consumer)
 */
export function getJetStream(): JetStreamClient {
  if (!js || !isConnected) {
    throw new Error('NATS JetStream not connected');
  }
  return js;
}

/**
 * Check if NATS is connected
 */
export function isNATSConnected(): boolean {
  return isConnected;
}

/**
 * Close NATS connection
 */
export async function closeNATS(): Promise<void> {
  if (nc) {
    await nc.drain();
    await nc.close();
    nc = null;
    js = null;
    isConnected = false;
    console.log('✓ NATS connection closed');
  }
}

/**
 * Get stream statistics
 */
export async function getStreamStats(): Promise<any> {
  if (!nc) throw new Error('NATS not initialized');

  const jsm = await nc.jetstreamManager();
  const stream = await jsm.streams.info(STREAM_NAME);

  return {
    name: stream.config.name,
    messages: stream.state.messages,
    bytes: stream.state.bytes,
    firstSeq: stream.state.first_seq,
    lastSeq: stream.state.last_seq,
    consumerCount: stream.state.consumer_count,
  };
}
