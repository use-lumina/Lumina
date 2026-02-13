import { pgTable, varchar, timestamp, boolean, index, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * API Keys Table Schema
 * Stores API keys for multi-tenant authentication
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    apiKey: varchar('api_key', { length: 255 }).primaryKey(),
    customerId: varchar('customer_id', { length: 255 }).notNull(),
    customerName: varchar('customer_name', { length: 255 }),
    environment: varchar('environment', { length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    // Indexes
    customerIdIdx: index('idx_api_keys_customer_id').on(table.customerId),
    activeIdx: index('idx_api_keys_active').on(table.isActive),

    // CHECK constraint for environment
    environmentCheck: check(
      'api_keys_environment_check',
      sql`${table.environment} IN ('live', 'test')`
    ),
  })
);

/**
 * Users Table Schema
 * Stores user credentials for dashboard authentication
 */
export const users = pgTable(
  'users',
  {
    userId: varchar('user_id', { length: 255 }).primaryKey(),
    customerId: varchar('customer_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    isTemporaryPassword: boolean('is_temporary_password').default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    // Unique constraint on email
    emailUnique: unique('users_email_unique').on(table.email),

    // Indexes
    customerIdIdx: index('idx_users_customer_id').on(table.customerId),
    emailIdx: index('idx_users_email').on(table.email),
  })
);

// TypeScript types inferred from schema
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
