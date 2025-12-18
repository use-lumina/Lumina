import type postgres from 'postgres';

/**
 * Database migration interface
 */
export interface Migration {
  name: string;
  version: number;
  up: (sql: postgres.Sql) => Promise<void>;
  down?: (sql: postgres.Sql) => Promise<void>;
}
