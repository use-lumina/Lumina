/**
 * Type definitions for duckdb
 * DuckDB doesn't ship with official TypeScript types
 */

declare module 'duckdb' {
  export class Database {
    constructor(path: string, config?: any);

    all(sql: string, callback: (err: Error | null, rows: any[]) => void): void;
    all(sql: string, ...params: any[]): void;

    run(sql: string, callback: (err: Error | null) => void): void;
    run(sql: string, ...params: any[]): void;

    prepare(sql: string): Statement;

    close(callback: (err: Error | null) => void): void;
  }

  export class Statement {
    run(...params: any[]): void;
    all(...params: any[]): void;
    finalize(callback: (err: Error | null) => void): void;
  }

  export class Connection {
    all(sql: string, callback: (err: Error | null, rows: any[]) => void): void;
    run(sql: string, callback: (err: Error | null) => void): void;
    prepare(sql: string): Statement;
  }
}
