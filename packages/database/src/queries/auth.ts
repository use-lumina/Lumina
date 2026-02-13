import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../db';
import { apiKeys, users, type ApiKey, type NewApiKey, type User, type NewUser } from '../schema';

/**
 * API Keys Queries
 */

/**
 * Get an API key
 *
 * @example
 * ```typescript
 * const apiKey = await getApiKey(db, 'lum_abc123xyz');
 * ```
 */
export async function getApiKey(db: Database, apiKey: string): Promise<ApiKey | undefined> {
  const result = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, apiKey)).limit(1);
  return result[0];
}

/**
 * Get all API keys for a customer
 *
 * @example
 * ```typescript
 * const keys = await getApiKeysForCustomer(db, 'customer-123');
 * ```
 */
export async function getApiKeysForCustomer(db: Database, customerId: string): Promise<ApiKey[]> {
  return await db.select().from(apiKeys).where(eq(apiKeys.customerId, customerId));
}

/**
 * Create a new API key
 *
 * @example
 * ```typescript
 * await createApiKey(db, {
 *   apiKey: 'lum_abc123xyz',
 *   customerId: 'customer-123',
 *   customerName: 'Acme Corp',
 *   environment: 'live',
 * });
 * ```
 */
export async function createApiKey(db: Database, apiKey: NewApiKey): Promise<void> {
  await db.insert(apiKeys).values(apiKey);
}

/**
 * Update API key last used timestamp
 *
 * @example
 * ```typescript
 * await updateApiKeyLastUsed(db, 'lum_abc123xyz');
 * ```
 */
export async function updateApiKeyLastUsed(db: Database, apiKey: string): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.apiKey, apiKey));
}

/**
 * Deactivate an API key
 *
 * @example
 * ```typescript
 * await deactivateApiKey(db, 'lum_abc123xyz');
 * ```
 */
export async function deactivateApiKey(db: Database, apiKey: string): Promise<void> {
  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.apiKey, apiKey));
}

/**
 * Activate an API key
 *
 * @example
 * ```typescript
 * await activateApiKey(db, 'lum_abc123xyz');
 * ```
 */
export async function activateApiKey(db: Database, apiKey: string): Promise<void> {
  await db.update(apiKeys).set({ isActive: true }).where(eq(apiKeys.apiKey, apiKey));
}

/**
 * Delete an API key
 *
 * @example
 * ```typescript
 * await deleteApiKey(db, 'lum_abc123xyz');
 * ```
 */
export async function deleteApiKey(db: Database, apiKey: string): Promise<void> {
  await db.delete(apiKeys).where(eq(apiKeys.apiKey, apiKey));
}

/**
 * Users Queries
 */

/**
 * Get a user by ID
 *
 * @example
 * ```typescript
 * const user = await getUserById(db, 'user-123');
 * ```
 */
export async function getUserById(db: Database, userId: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
  return result[0];
}

/**
 * Get a user by email
 *
 * @example
 * ```typescript
 * const user = await getUserByEmail(db, 'user@example.com');
 * ```
 */
export async function getUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

/**
 * Get all users for a customer
 *
 * @example
 * ```typescript
 * const customerUsers = await getUsersForCustomer(db, 'customer-123');
 * ```
 */
export async function getUsersForCustomer(db: Database, customerId: string): Promise<User[]> {
  return await db.select().from(users).where(eq(users.customerId, customerId));
}

/**
 * Create a new user
 *
 * @example
 * ```typescript
 * await createUser(db, {
 *   userId: 'user-123',
 *   customerId: 'customer-456',
 *   email: 'user@example.com',
 *   passwordHash: 'hashed_password',
 *   name: 'John Doe',
 * });
 * ```
 */
export async function createUser(db: Database, user: NewUser): Promise<string> {
  const result = await db.insert(users).values(user).returning({ userId: users.userId });
  if (!result[0]) {
    throw new Error('Failed to create user');
  }
  return result[0].userId;
}

/**
 * Update user password
 *
 * @example
 * ```typescript
 * await updateUserPassword(db, 'user-123', 'new_hashed_password', false);
 * ```
 */
export async function updateUserPassword(
  db: Database,
  userId: string,
  passwordHash: string,
  isTemporary: boolean = false
): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash,
      isTemporaryPassword: isTemporary,
      updatedAt: new Date(),
    })
    .where(eq(users.userId, userId));
}

/**
 * Update user profile
 *
 * @example
 * ```typescript
 * await updateUserProfile(db, 'user-123', { name: 'Jane Doe' });
 * ```
 */
export async function updateUserProfile(
  db: Database,
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email'>>
): Promise<void> {
  await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.userId, userId));
}

/**
 * Delete a user
 *
 * @example
 * ```typescript
 * await deleteUser(db, 'user-123');
 * ```
 */
export async function deleteUser(db: Database, userId: string): Promise<boolean> {
  const result = await db
    .delete(users)
    .where(eq(users.userId, userId))
    .returning({ id: users.userId });
  return result.length > 0;
}

/**
 * Authenticate user by email and check if password matches
 * Note: This only retrieves the user - password verification should be done separately
 *
 * @example
 * ```typescript
 * const user = await authenticateUser(db, 'user@example.com');
 * if (user && await bcrypt.compare(password, user.passwordHash)) {
 *   // Authentication successful
 * }
 * ```
 */
export async function authenticateUser(db: Database, email: string): Promise<User | undefined> {
  return await getUserByEmail(db, email);
}

/**
 * Get all users with optional filters
 *
 * @example
 * ```typescript
 * const allUsers = await getAllUsers(db);
 * const customerUsers = await getAllUsers(db, { customerId: 'customer-123' });
 * ```
 */
export async function getAllUsers(
  db: Database,
  filters?: {
    customerId?: string;
  }
): Promise<User[]> {
  if (filters?.customerId) {
    return await getUsersForCustomer(db, filters.customerId);
  }

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

/**
 * Update API key status (active/inactive)
 *
 * @example
 * ```typescript
 * await updateApiKeyStatus(db, 'lum_abc123', true);
 * ```
 */
export async function updateApiKeyStatus(
  db: Database,
  apiKey: string,
  isActive: boolean
): Promise<void> {
  if (isActive) {
    await activateApiKey(db, apiKey);
  } else {
    await deactivateApiKey(db, apiKey);
  }
}

/**
 * Get all API keys with optional filters
 *
 * @example
 * ```typescript
 * const allKeys = await getAllApiKeys(db);
 * const activeKeys = await getAllApiKeys(db, { isActive: true });
 * ```
 */
export async function getAllApiKeys(
  db: Database,
  filters?: {
    isActive?: boolean;
    environment?: 'live' | 'test';
  }
): Promise<ApiKey[]> {
  const conditions = [];

  if (filters?.isActive !== undefined) {
    conditions.push(eq(apiKeys.isActive, filters.isActive));
  }

  if (filters?.environment) {
    conditions.push(eq(apiKeys.environment, filters.environment));
  }

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(apiKeys)
          .where(and(...conditions))
      : db.select().from(apiKeys);

  return await query.orderBy(desc(apiKeys.createdAt));
}

// Aliases for test compatibility
export const getApiKeyByKey = getApiKey;
export const getApiKeysByCustomerId = getApiKeysForCustomer;
