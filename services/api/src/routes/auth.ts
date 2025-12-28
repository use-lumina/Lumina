/**
 * Authentication Routes
 * Handles user login, password changes, and token refresh
 */

import { Hono } from 'hono';
import { getDB } from '../database/postgres';
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

    const sql = getDB().getClient();

    // Find user by email
    const users = await sql`
      SELECT user_id, customer_id, email, password_hash, name, is_temporary_password
      FROM users
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const user = users[0];

    // Verify password using Bun's built-in password verification
    const isValid = await Bun.password.verify(password, user.password_hash);

    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.user_id,
      customerId: user.customer_id,
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
        userId: user.user_id,
        customerId: user.customer_id,
        email: user.email,
        name: user.name,
        isTemporaryPassword: user.is_temporary_password,
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

    const sql = getDB().getClient();

    // Get user's current password hash
    const users = await sql`
      SELECT password_hash
      FROM users
      WHERE user_id = ${auth.userId}
    `;

    if (users.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = users[0];

    // Verify current password
    const isValid = await Bun.password.verify(currentPassword, user.password_hash);

    if (!isValid) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newPasswordHash = await Bun.password.hash(newPassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    // Update password and mark as not temporary
    await sql`
      UPDATE users
      SET
        password_hash = ${newPasswordHash},
        is_temporary_password = false,
        updated_at = NOW()
      WHERE user_id = ${auth.userId}
    `;

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

    const sql = getDB().getClient();

    // Get user information
    const users = await sql`
      SELECT u.user_id, u.customer_id, u.email, u.name, u.is_temporary_password, u.created_at,
             a.customer_name
      FROM users u
      LEFT JOIN api_keys a ON u.customer_id = a.customer_id
      WHERE u.user_id = ${auth.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = users[0];

    return c.json({
      userId: user.user_id,
      customerId: user.customer_id,
      customerName: user.customer_name,
      email: user.email,
      name: user.name,
      isTemporaryPassword: user.is_temporary_password,
      createdAt: user.created_at,
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

export default app;

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
