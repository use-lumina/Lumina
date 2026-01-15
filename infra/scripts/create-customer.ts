#!/usr/bin/env bun

/**
 * Customer Onboarding Script
 *
 * Creates a new customer account with:
 * - API keys (live and test)
 * - User account with temporary password
 *
 * Usage:
 * bun run infra/scripts/create-customer.ts --name "Acme Corp" --email "eng@acme.com"
 */

import postgres from 'postgres';
import { randomBytes } from 'crypto';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: { name?: string; email?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      parsed.name = args[i + 1];
      i++;
    } else if (args[i] === '--email' && args[i + 1]) {
      parsed.email = args[i + 1];
      i++;
    }
  }

  return parsed;
}

// Generate API key
function generateApiKey(customerId: string, _environment: 'live' | 'test'): string {
  const randomString = randomBytes(20).toString('hex');
  return `lumina_${customerId}_${randomString}`;
}

// Generate customer ID
function generateCustomerId(): string {
  const randomString = randomBytes(8).toString('hex');
  return `customer_${randomString}`;
}

// Generate user ID
function generateUserId(): string {
  const randomString = randomBytes(8).toString('hex');
  return `user_${randomString}`;
}

// Generate temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const password = Array.from(
    { length: 16 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return password;
}

// Hash password using Bun's built-in password hashing
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  });
}

async function main() {
  const { name, email } = parseArgs();

  // Validate required arguments
  if (!name || !email) {
    console.error('❌ Error: Missing required arguments');
    console.log('\nUsage:');
    console.log(
      '  bun run infra/scripts/create-customer.ts --name "Company Name" --email "user@example.com"'
    );
    console.log('\nExample:');
    console.log(
      '  bun run infra/scripts/create-customer.ts --name "Acme Corp" --email "eng@acme.com"'
    );
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Error: Invalid email format');
    process.exit(1);
  }

  // Connect to database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    console.log('\nSet it with:');
    console.log('  export DATABASE_URL="postgres://user@localhost:5432/lumina"');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('\n🚀 Creating customer account...\n');

    // Generate IDs and keys
    const customerId = generateCustomerId();
    const userId = generateUserId();
    const liveApiKey = generateApiKey(customerId, 'live');
    const testApiKey = generateApiKey(customerId, 'test');
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Check if email already exists
    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      console.error(`❌ Error: User with email ${email} already exists`);
      process.exit(1);
    }

    // Begin transaction
    await sql.begin(async (sql) => {
      // Create live API key
      await sql`
        INSERT INTO api_keys (api_key, customer_id, customer_name, environment, created_at, is_active)
        VALUES (${liveApiKey}, ${customerId}, ${name}, 'live', NOW(), true)
      `;

      // Create test API key
      await sql`
        INSERT INTO api_keys (api_key, customer_id, customer_name, environment, created_at, is_active)
        VALUES (${testApiKey}, ${customerId}, ${name}, 'test', NOW(), true)
      `;

      // Create user
      await sql`
        INSERT INTO users (user_id, customer_id, email, password_hash, name, is_temporary_password, created_at)
        VALUES (${userId}, ${customerId}, ${email}, ${passwordHash}, ${name}, true, NOW())
      `;
    });

    // Success output
    console.log('✅ Customer created successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Customer ID:      ${customerId}`);
    console.log(`Customer Name:    ${name}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔑 API Keys:');
    console.log(`  Live:  ${liveApiKey}`);
    console.log(`  Test:  ${testApiKey}\n`);

    console.log('👤 User Account:');
    console.log(`  User ID:  ${userId}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${tempPassword}`);
    console.log(`  (⚠️  Temporary - user must reset on first login)\n`);

    console.log('📧 Next Steps:');
    console.log('  1. Share credentials with design partner via secure channel');
    console.log('  2. User should reset password on first login');
    console.log('  3. Integrate API key into their application\n');
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
