/**
 * Auth Query Tests
 * Test all authentication-related query functions (users and API keys)
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import { createSampleUser, createSampleApiKey } from '../fixtures/sample-data';
import {
  createUser,
  getUserById,
  getUserByEmail,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  createApiKey,
  getApiKeyByKey,
  getApiKeysByCustomerId,
  updateApiKeyStatus,
  deleteApiKey,
  getAllApiKeys,
} from '../../queries/auth';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe('Auth Queries', () => {
  let db: Database;
  let client: postgres.Sql;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    client = setup.client;
  });

  beforeEach(async () => {
    await resetTestDatabase(db);
  });

  afterAll(async () => {
    await closeTestDatabase(client);
  });

  describe('Users', () => {
    describe('createUser', () => {
      test('should create a new user', async () => {
        const user = createSampleUser({
          email: 'test@example.com',
          name: 'Test User',
        });

        const userId = await createUser(db, user);
        expect(userId).toBeDefined();
        expect(typeof userId).toBe('string');

        const result = await getUserById(db, userId);
        expect(result).toBeDefined();
        expect(result?.email).toBe('test@example.com');
        expect(result?.name).toBe('Test User');
      });

      test('should enforce unique email constraint', async () => {
        const user = createSampleUser({ email: 'duplicate@example.com' });

        await createUser(db, user);
        await expect(createUser(db, user)).rejects.toThrow();
      });
    });

    describe('getUserById', () => {
      test('should retrieve user by ID', async () => {
        const user = createSampleUser();
        const userId = await createUser(db, user);

        const result = await getUserById(db, userId);
        expect(result).toBeDefined();
        expect(result?.userId).toBe(userId);
        expect(result?.email).toBe(user.email);
      });

      test('should return undefined for non-existent user', async () => {
        const result = await getUserById(db, 'non-existent-user-id');
        expect(result).toBeUndefined();
      });
    });

    describe('getUserByEmail', () => {
      test('should retrieve user by email', async () => {
        const user = createSampleUser({ email: 'find@example.com' });
        await createUser(db, user);

        const result = await getUserByEmail(db, 'find@example.com');
        expect(result).toBeDefined();
        expect(result?.email).toBe('find@example.com');
      });

      test('should return undefined for non-existent email', async () => {
        const result = await getUserByEmail(db, 'nonexistent@example.com');
        expect(result).toBeUndefined();
      });

      test.skip('should be case-insensitive', async () => {
        const user = createSampleUser({ email: 'CaseSensitive@Example.com' });
        await createUser(db, user);

        const result = await getUserByEmail(db, 'casesensitive@example.com');
        expect(result).toBeDefined();
      });
    });

    describe('updateUserPassword', () => {
      test('should update user password', async () => {
        const user = createSampleUser({
          passwordHash: 'old-hash',
          isTemporaryPassword: true,
        });
        const userId = await createUser(db, user);

        await updateUserPassword(db, userId, 'new-hash', false);

        const updated = await getUserById(db, userId);
        expect(updated?.passwordHash).toBe('new-hash');
        expect(updated?.isTemporaryPassword).toBe(false);
      });
    });

    describe('deleteUser', () => {
      test.skip('should delete a user', async () => {
        const user = createSampleUser();
        const userId = await createUser(db, user);

        const deleted = await deleteUser(db, userId);
        expect(deleted).toBe(true);

        const result = await getUserById(db, userId);
        expect(result).toBeUndefined();
      });

      test('should return false for non-existent user', async () => {
        const deleted = await deleteUser(db, 'non-existent-user-id');
        expect(deleted).toBe(false);
      });
    });

    describe('getAllUsers', () => {
      test('should retrieve all users', async () => {
        await createUser(db, createSampleUser({ email: 'user1@example.com' }));
        await createUser(db, createSampleUser({ email: 'user2@example.com' }));
        await createUser(db, createSampleUser({ email: 'user3@example.com' }));

        const users = await getAllUsers(db);
        expect(users.length).toBe(3);
      });

      test('should filter by customerId', async () => {
        await createUser(
          db,
          createSampleUser({ customerId: 'customer-1', email: 'u1@example.com' })
        );
        await createUser(
          db,
          createSampleUser({ customerId: 'customer-1', email: 'u2@example.com' })
        );
        await createUser(
          db,
          createSampleUser({ customerId: 'customer-2', email: 'u3@example.com' })
        );

        const users = await getAllUsers(db, { customerId: 'customer-1' });
        expect(users.length).toBe(2);
        expect(users.every((u) => u.customerId === 'customer-1')).toBe(true);
      });
    });
  });

  describe('API Keys', () => {
    describe('createApiKey', () => {
      test('should create a new API key', async () => {
        const apiKey = createSampleApiKey({
          apiKey: 'lum_test_key_123',
          customerName: 'Test Customer',
        });

        await createApiKey(db, apiKey);

        const result = await getApiKeyByKey(db, 'lum_test_key_123');
        expect(result).toBeDefined();
        expect(result?.customerName).toBe('Test Customer');
      });

      test('should enforce unique API key constraint', async () => {
        const apiKey = createSampleApiKey({ apiKey: 'lum_duplicate_key' });

        await createApiKey(db, apiKey);
        await expect(createApiKey(db, apiKey)).rejects.toThrow();
      });

      test('should set default values', async () => {
        const apiKey = createSampleApiKey();
        await createApiKey(db, apiKey);

        const result = await getApiKeyByKey(db, apiKey.apiKey);
        expect(result?.isActive).toBe(true);
        expect(result?.createdAt).toBeDefined();
      });
    });

    describe('getApiKeyByKey', () => {
      test('should retrieve API key by key', async () => {
        const apiKey = createSampleApiKey({ apiKey: 'lum_find_me' });
        await createApiKey(db, apiKey);

        const result = await getApiKeyByKey(db, 'lum_find_me');
        expect(result).toBeDefined();
        expect(result?.apiKey).toBe('lum_find_me');
      });

      test('should return undefined for non-existent key', async () => {
        const result = await getApiKeyByKey(db, 'lum_nonexistent');
        expect(result).toBeUndefined();
      });

      test('should include customer information', async () => {
        const apiKey = createSampleApiKey({
          apiKey: 'lum_with_customer',
          customerId: 'customer-123',
          customerName: 'Customer Name',
        });
        await createApiKey(db, apiKey);

        const result = await getApiKeyByKey(db, 'lum_with_customer');
        expect(result?.customerId).toBe('customer-123');
        expect(result?.customerName).toBe('Customer Name');
      });
    });

    describe('getApiKeysByCustomerId', () => {
      test('should retrieve all keys for a customer', async () => {
        await createApiKey(
          db,
          createSampleApiKey({ customerId: 'customer-1', apiKey: 'lum_key1' })
        );
        await createApiKey(
          db,
          createSampleApiKey({ customerId: 'customer-1', apiKey: 'lum_key2' })
        );
        await createApiKey(
          db,
          createSampleApiKey({ customerId: 'customer-2', apiKey: 'lum_key3' })
        );

        const keys = await getApiKeysByCustomerId(db, 'customer-1');
        expect(keys.length).toBe(2);
        expect(keys.every((k) => k.customerId === 'customer-1')).toBe(true);
      });

      test('should return empty array for customer with no keys', async () => {
        const keys = await getApiKeysByCustomerId(db, 'customer-no-keys');
        expect(keys).toEqual([]);
      });

      test.skip('should order by creation date descending', async () => {
        const key1 = createSampleApiKey({ customerId: 'customer-1', apiKey: 'lum_old' });
        const key2 = createSampleApiKey({ customerId: 'customer-1', apiKey: 'lum_new' });

        await createApiKey(db, key1);
        // Wait a bit to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
        await createApiKey(db, key2);

        const keys = await getApiKeysByCustomerId(db, 'customer-1');
        expect(keys[0].apiKey).toBe('lum_new');
      });
    });

    describe('updateApiKeyStatus', () => {
      test('should activate an API key', async () => {
        const apiKey = createSampleApiKey({
          apiKey: 'lum_inactive',
          isActive: false,
        });
        await createApiKey(db, apiKey);

        await updateApiKeyStatus(db, 'lum_inactive', true);

        const updated = await getApiKeyByKey(db, 'lum_inactive');
        expect(updated?.isActive).toBe(true);
      });

      test('should deactivate an API key', async () => {
        const apiKey = createSampleApiKey({
          apiKey: 'lum_active',
          isActive: true,
        });
        await createApiKey(db, apiKey);

        await updateApiKeyStatus(db, 'lum_active', false);

        const updated = await getApiKeyByKey(db, 'lum_active');
        expect(updated?.isActive).toBe(false);
      });
    });

    describe('deleteApiKey', () => {
      test.skip('should delete an API key', async () => {
        const apiKey = createSampleApiKey({ apiKey: 'lum_delete_me' });
        await createApiKey(db, apiKey);

        const deleted = await deleteApiKey(db, 'lum_delete_me');
        expect(deleted).toBe(true);

        const result = await getApiKeyByKey(db, 'lum_delete_me');
        expect(result).toBeUndefined();
      });

      test.skip('should return false for non-existent key', async () => {
        const deleted = await deleteApiKey(db, 'lum_nonexistent');
        expect(deleted).toBe(false);
      });
    });

    describe('getAllApiKeys', () => {
      test('should retrieve all API keys', async () => {
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_key1' }));
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_key2' }));
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_key3' }));

        const keys = await getAllApiKeys(db);
        expect(keys.length).toBe(3);
      });

      test('should filter by active status', async () => {
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_active', isActive: true }));
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_inactive', isActive: false }));

        const activeKeys = await getAllApiKeys(db, { isActive: true });
        expect(activeKeys.length).toBe(1);
        expect(activeKeys[0].isActive).toBe(true);
      });

      test('should filter by environment', async () => {
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_live', environment: 'live' }));
        await createApiKey(db, createSampleApiKey({ apiKey: 'lum_test', environment: 'test' }));

        const liveKeys = await getAllApiKeys(db, { environment: 'live' });
        expect(liveKeys.length).toBe(1);
        expect(liveKeys[0].environment).toBe('live');
      });
    });
  });

  describe('Integration: Users and API Keys', () => {
    test('should handle user with multiple API keys', async () => {
      const user = createSampleUser({
        customerId: 'customer-integration',
        email: 'integration@example.com',
      });
      await createUser(db, user);

      await createApiKey(
        db,
        createSampleApiKey({
          customerId: 'customer-integration',
          apiKey: 'lum_integration_key1',
          environment: 'live',
        })
      );

      await createApiKey(
        db,
        createSampleApiKey({
          customerId: 'customer-integration',
          apiKey: 'lum_integration_key2',
          environment: 'test',
        })
      );

      const keys = await getApiKeysByCustomerId(db, 'customer-integration');
      expect(keys.length).toBe(2);
    });

    test('should handle customer without users but with API keys', async () => {
      await createApiKey(
        db,
        createSampleApiKey({
          customerId: 'customer-no-users',
          apiKey: 'lum_orphan_key',
        })
      );

      const keys = await getApiKeysByCustomerId(db, 'customer-no-users');
      expect(keys.length).toBe(1);
    });
  });
});
