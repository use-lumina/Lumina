import type { Next } from 'hono';
import type { AppContext } from '../types/hono';

/**
 * Authentication middleware
 * Validates Bearer token from Authorization header
 */
export async function authMiddleware(c: AppContext, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return c.json({ error: 'Invalid Authorization header format. Expected: Bearer <token>' }, 401);
  }

  // TODO: Validate token against database
  // For MVP, we'll just extract customer_id from a simple token format
  // In production, this would be a JWT or API key lookup
  const customerId = extractCustomerId(token);

  if (!customerId) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Attach customer_id to context for downstream handlers
  c.set('customerId', customerId);

  await next();
}

/**
 * Extract customer ID from token
 * MVP implementation: token format is "lumina_<customer_id>_<random>"
 * Customer ID can contain underscores (e.g., customer_9cd1f4692e64871f)
 * Production would use JWT or proper API key management
 */
function extractCustomerId(token: string): string | null {
  // Simple validation for MVP
  if (!token.startsWith('lumina_')) {
    return null;
  }

  // Remove the "lumina_" prefix
  const withoutPrefix = token.substring('lumina_'.length);

  // Split the remaining string and take everything except the last part (which is the random suffix)
  const parts = withoutPrefix.split('_');
  if (parts.length < 2) {
    return null;
  }

  // Join all parts except the last one (the random suffix is the last part with 40 hex chars)
  const lastPart = parts[parts.length - 1];

  // Check if last part looks like a random hex string (40 chars)
  if (lastPart.length === 40 && /^[a-f0-9]+$/.test(lastPart)) {
    // Last part is the random suffix, so customer_id is everything before it
    return parts.slice(0, -1).join('_');
  }

  // Fallback: assume customer_id is the first part after lumina_
  return parts[0] || null;
}
