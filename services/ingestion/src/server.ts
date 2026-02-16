import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import traces from './routes/traces';
import { initializeNATS } from './queue/nats-client';
import { startConsumer } from './queue/consumer';
import { initializeCache } from '@lumina/core';
import { initializeSemanticScorer } from '@lumina/core';
import { scheduleRetentionCleanup } from './jobs/retention-cleanup';
import { scheduleBaselineUpdates } from './jobs/update-baselines';
import type { AppVariables } from './types/hono';

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*', // TODO: Configure based on environment
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'lumina-ingestion' });
});

// Apply auth middleware to all trace routes
app.use('/v1/*', authMiddleware);

// Mount trace routes
app.route('/', traces);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500
  );
});

// Initialize services on startup
async function initializeServices() {
  try {
    // Note: Database client is ready to use immediately with Drizzle
    console.log('✅ Database client ready');

    // Initialize NATS (required for alert processing)
    try {
      await initializeNATS();
      console.log('✅ NATS initialized successfully');

      // Start NATS consumer for alert processing
      startConsumer().catch((error) => {
        console.error('⚠️  Failed to start NATS consumer:', error);
        // Don't exit - system can still ingest traces even if consumer fails
      });
    } catch (error) {
      console.error('⚠️  NATS initialization failed - alerts will be disabled:', error);
      // Don't exit - traces can still be ingested without alerts
    }

    // Initialize Redis cache (optional - graceful degradation)
    try {
      initializeCache();
      console.log('✅ Redis cache initialized successfully');
    } catch (error) {
      console.error('⚠️  Redis initialization failed - caching disabled:', error);
      // Don't exit - system works without cache
    }

    // Initialize semantic scorer (optional - requires Anthropic API key)
    try {
      initializeSemanticScorer();
      console.log('✅ Semantic scorer initialized successfully');
    } catch (error) {
      console.error('⚠️  Semantic scorer initialization failed:', error);
      // Don't exit - system works without semantic scoring
    }

    // Start retention cleanup job (7-day retention for self-hosted)
    try {
      scheduleRetentionCleanup();
      console.log('✅ Retention cleanup job scheduled (7-day retention)');
    } catch (error) {
      console.error('⚠️  Failed to schedule retention cleanup:', error);
      // Don't exit - system works without cleanup (just won't delete old traces)
    }

    // Start baseline update job (calculates P50/P95/P99 for analytics)
    try {
      scheduleBaselineUpdates();
      console.log('✅ Baseline update job scheduled (1h/24h/7d windows)');
    } catch (error) {
      console.error('⚠️  Failed to schedule baseline updates:', error);
      // Don't exit - system works without baseline updates (alerts still work with on-the-fly calculation)
    }
  } catch (error) {
    console.error('❌ Failed to initialize critical services:', error);
    process.exit(1);
  }
}

// Start initialization
initializeServices().then(() => {
  console.log('🚀 All services initialized, ready to accept requests');
});

// Start server
const port = parseInt(process.env.PORT || '8080');

console.log(`Lumina Ingestion Service starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
