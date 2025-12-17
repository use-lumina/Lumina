import { createHash } from 'crypto';

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `trace_${timestamp}_${randomPart}`;
}

/**
 * Generate a unique span ID
 */
export function generateSpanId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `span_${timestamp}_${randomPart}`;
}

/**
 * Hash a response for quality comparison
 * Normalizes and creates a consistent hash
 */
export function hashResponse(response: string): string {
  // Normalize the response
  const normalized = response.toLowerCase().replace(/\s+/g, ' ').trim();

  // Create SHA-256 hash
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Truncate long strings for logging
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Safe JSON stringify with circular reference handling
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}