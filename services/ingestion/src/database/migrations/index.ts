import { createTracesTable } from './001_create_traces_table';
import { createCostBaselinesTable } from './002_create_cost_baselines_table';
import { addSemanticScoresAndAlerts } from './003_add_semantic_scores_and_alerts';
import type { Migration } from '../types';

/**
 * All database migrations in order
 */
export const migrations: Migration[] = [
  createTracesTable,
  createCostBaselinesTable,
  addSemanticScoresAndAlerts,
];
