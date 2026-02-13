/**
 * Lumina Database Schema
 * Exports all table schemas and TypeScript types
 */

// Traces
export { traces, type Trace, type NewTrace } from './traces';

// Alerts
export { alerts, type Alert, type NewAlert } from './alerts';

// Cost Baselines
export { costBaselines, type CostBaseline, type NewCostBaseline } from './baselines';

// Authentication (Users and API Keys)
export { apiKeys, users, type ApiKey, type NewApiKey, type User, type NewUser } from './auth';

// Replay (Replay Sets and Results)
export {
  replaySets,
  replayResults,
  type ReplaySet,
  type NewReplaySet,
  type ReplayResult,
  type NewReplayResult,
} from './replay';

// Export all schemas as a single object for Drizzle
import { traces } from './traces';
import { alerts } from './alerts';
import { costBaselines } from './baselines';
import { apiKeys, users } from './auth';
import { replaySets, replayResults } from './replay';

export const schema = {
  traces,
  alerts,
  costBaselines,
  apiKeys,
  users,
  replaySets,
  replayResults,
};
