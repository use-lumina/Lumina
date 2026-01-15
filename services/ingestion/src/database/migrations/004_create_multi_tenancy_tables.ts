import type { Migration } from '../types';

export const createMultiTenancyTables: Migration = {
  name: 'create_multi_tenancy_tables',
  version: 4,

  async up(sql) {
    // Create api_keys table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        api_key VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        environment VARCHAR(10) CHECK (environment IN ('live', 'test')) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      )
    `;

    // Create index for customer_id lookups (not unique since one customer can have multiple keys)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_customer_id
      ON api_keys(customer_id)
    `;

    // Create index for active keys
    await sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_active
      ON api_keys(is_active)
    `;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_temporary_password BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create index for customer_id lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_customer_id
      ON users(customer_id)
    `;

    // Create index for email lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email)
    `;

    // Note: We don't add a foreign key constraint because customer_id is not unique in api_keys
    // (one customer can have multiple API keys for different environments).
    // The relationship is enforced by application logic.
  },

  async down(sql) {
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS api_keys CASCADE`;
  },
};
