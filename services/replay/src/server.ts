/**
 * Lumina Replay Engine Service
 * Captures and re-executes production traffic for regression testing
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDB } from './database/postgres';
import replayRoutes from './routes/replay';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'lumina-replay',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/replay', replayRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Replay Engine Error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500
  );
});

// Initialize database and start server
const PORT = Number(Bun.env.REPLAY_PORT) || 8082;

async function start() {
  try {
    // Initialize database connection and create tables
    const db = getDB();
    await db.initialize();
    console.log('✅ Database connection established and tables created');

    // Start server
    console.log(`🚀 Lumina Replay Engine starting on port ${PORT}...`);

    Bun.serve({
      port: PORT,
      fetch: app.fetch,
    });

    console.log(`✅ Replay Engine listening on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  } catch (error) {
    console.error('❌ Failed to start Replay Engine:', error);
    process.exit(1);
  }
}

start();