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

  let finalToken = token;
  // If no token in header, check cookie
  if (!finalToken) {
    const cookieHeader = c.req.header('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|; )lumina_token=([^;]+)/);
      if (match) {
        finalToken = match[1];
      }
    }
  }

  if (!finalToken) {
    return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
  }

  const payload = await verifyToken(finalToken);

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

  let finalToken = token;
  if (!finalToken) {
    const cookieHeader = c.req.header('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|; )lumina_token=([^;]+)/);
      if (match) finalToken = match[1];
    }
  }

  if (finalToken) {
    const payload = await verifyToken(finalToken);
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
