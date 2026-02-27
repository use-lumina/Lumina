export type TraceStatus = 'success' | 'error';

const SUCCESS_STATUSES = new Set(['success', 'ok', 'healthy', 'completed', 'pass', 'passed']);

const ERROR_STATUSES = new Set([
  'error',
  'failed',
  'failure',
  'unhealthy',
  'timeout',
  'timed_out',
  'cancelled',
  'canceled',
  'exception',
  'aborted',
  'rejected',
  'panic',
  'panicked',
  'partial',
]);

export function normalizeTraceStatus(status?: string | null): TraceStatus {
  if (!status) return 'success';

  const normalized = status.trim().toLowerCase();

  if (!normalized || normalized === 'unset' || normalized === 'unknown') {
    return 'success';
  }

  if (SUCCESS_STATUSES.has(normalized)) return 'success';
  if (ERROR_STATUSES.has(normalized)) return 'error';

  if (
    normalized.includes('error') ||
    normalized.includes('fail') ||
    normalized.includes('exception') ||
    normalized.includes('timeout') ||
    normalized.includes('cancel')
  ) {
    return 'error';
  }

  return 'success';
}
