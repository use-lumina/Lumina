/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to context
 */

import { Context, Next } from 'hono';
import { verifyToken, extractToken } from '../lib/jwt';

export interface AuthContext {
  userId: string;
  customerId: string;
  email: string;
}

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user info to context
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // Attach user info to context
  c.set('auth', {
    userId: payload.userId,
    customerId: payload.customerId,
    email: payload.email,
  } as AuthContext);

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't fail if not
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      c.set('auth', {
        userId: payload.userId,
        customerId: payload.customerId,
        email: payload.email,
      } as AuthContext);
    }
  }

  await next();
}

/**
 * Get auth context from Hono context
 */
export function getAuth(c: Context): AuthContext | undefined {
  return c.get('auth');
}