import { createTracesTable } from './001_create_traces_table';
import { createCostBaselinesTable } from './002_create_cost_baselines_table';
import type { Migration } from '../types';

/**
 * All database migrations in order
 */
export const migrations: Migration[] = [createTracesTable, createCostBaselinesTable];
