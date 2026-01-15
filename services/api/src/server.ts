/**
 * Lumina Query API Service
 * Provides RESTful endpoints for dashboard queries
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDB } from './database/postgres';
import tracesRoutes from './routes/traces';
import analyticsRoutes from './routes/analytics';
import alertsRoutes from './routes/alerts';
import authRoutes from './routes/auth';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'lumina-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/auth', authRoutes);
app.route('/traces', tracesRoutes);
app.route('/cost', analyticsRoutes);
app.route('/alerts', alertsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500
  );
});

// Initialize database and start server
const PORT = Number(Bun.env.API_PORT) || 8081;

async function start() {
  try {
    // Initialize database connection
    const db = getDB();
    await db.initialize();
    console.log('✅ Database connection established');

    // Start server
    console.log(`🚀 Lumina Query API starting on port ${PORT}...`);

    Bun.serve({
      port: PORT,
      fetch: app.fetch,
    });

    console.log(`✅ Query API listening on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  } catch (error) {
    console.error('❌ Failed to start API server:', error);
    process.exit(1);
  }
}

start();
