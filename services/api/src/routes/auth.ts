/**
 * Authentication Routes
 * Handles user login, password changes, and token refresh
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  getDatabase,
  users,
  apiKeys,
  getUserByEmail,
  updateUserPassword,
} from '../database/client';
import { generateToken } from '../lib/jwt';
import { requireAuth, getAuth } from '../middleware/auth';

const app = new Hono();

/**
 * POST /auth/login
 * User login with email and password
 */
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = getDatabase();

    // Find user by email
    const user = await getUserByEmail(db, email);

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password using Bun's built-in password verification
    const isValid = await Bun.password.verify(password, user.passwordHash);

    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.userId,
      customerId: user.customerId,
      email: user.email,
    });

    // Set httpOnly cookie for the token. In production we mark Secure.
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const sameSite = 'Lax';
    const cookie = `lumina_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secureFlag}`;

    // Set cookie header
    c.header('Set-Cookie', cookie);

    // Return user info. Keep token in body for compatibility but clients should rely on cookie.
    return c.json({
      token,
      user: {
        userId: user.userId,
        customerId: user.customerId,
        email: user.email,
        name: user.name,
        isTemporaryPassword: user.isTemporaryPassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 */
app.post('/change-password', requireAuth, async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current and new passwords are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    const db = getDatabase();

    // Get user's current password hash
    const userResult = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);

    if (userResult.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = userResult[0];

    // Verify current password
    const isValid = await Bun.password.verify(currentPassword, user.passwordHash);

    if (!isValid) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newPasswordHash = await Bun.password.hash(newPassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    // Update password and mark as not temporary
    await updateUserPassword(db, auth.userId, newPasswordHash, false);

    return c.json({
      message: 'Password changed successfully',
      isTemporaryPassword: false,
    });
  } catch (error) {
    console.error('Password change error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /auth/me
 * Get current user information (requires authentication)
 */
app.get('/me', requireAuth, async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();

    // Get user information with customer name from api_keys
    const userResult = await db
      .select({
        userId: users.userId,
        customerId: users.customerId,
        email: users.email,
        name: users.name,
        isTemporaryPassword: users.isTemporaryPassword,
        createdAt: users.createdAt,
        customerName: apiKeys.customerName,
      })
      .from(users)
      .leftJoin(apiKeys, eq(users.customerId, apiKeys.customerId))
      .where(eq(users.userId, auth.userId))
      .limit(1);

    if (userResult.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = userResult[0];

    return c.json({
      userId: user.userId,
      customerId: user.customerId,
      customerName: user.customerName,
      email: user.email,
      name: user.name,
      isTemporaryPassword: user.isTemporaryPassword,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/refresh
 * Refresh JWT token (requires valid token)
 */
app.post('/refresh', requireAuth, async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Generate new token with same payload
    const token = await generateToken({
      userId: auth.userId,
      customerId: auth.customerId,
      email: auth.email,
    });

    return c.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/logout
 * Clear the httpOnly token cookie
 */
app.post('/logout', async (c) => {
  // Be defensive: always attempt to clear the cookie and return success.
  try {
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cookie = `lumina_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;

    // Set cookie header to clear the cookie
    c.header('Set-Cookie', cookie);

    // Return success
    return c.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if something fails, return success
    return c.json({ ok: true });
  }
});

export default app;
