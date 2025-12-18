import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import traces from './routes/traces';
import { getDB } from './database/postgres';
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

// Initialize database on startup
const db = getDB();
db.initialize()
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });

// Start server
const port = parseInt(process.env.PORT || '8080');

console.log(`Lumina Ingestion Service starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
