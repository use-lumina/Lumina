import type { Context } from 'hono';

/**
 * Custom context variables set by middleware
 */
export type AppVariables = {
  customerId: string;
};

/**
 * Typed Hono context for the application
 */
export type AppContext = Context<{ Variables: AppVariables }>;
