// Cookie-only auth helper. Client-side should not store tokens in local/session storage.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function logout(redirect = true) {
  try {
    // Call backend logout to clear httpOnly cookie
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Logout error:', e);
    // Ignore network errors during logout
    // We'll still redirect the user to the auth page
  }

  if (typeof window !== 'undefined' && redirect) {
    // Force reload to clear any cached state
    window.location.href = '/auth';
  }
}

// Deprecated: no client-side token access (use cookie-based flow and /auth/me)
export function isAuthenticated(): boolean {
  // This cannot be determined synchronously when cookies are httpOnly.
  // Return false as a conservative default; components should call `/auth/me`.
  return false;
}

// Compatibility shims for older imports. Prefer cookie+`/auth/me` approach.
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    // warn once in dev

    console.warn('getToken() is deprecated. Use cookie-based auth and call /auth/me');
  }
  return null;
}

export function setToken(_: string, __?: boolean) {
  if (typeof window !== 'undefined') {
    console.warn('setToken() is deprecated. Server sets httpOnly cookie on login.');
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    console.warn('clearToken() is deprecated. Use POST /auth/logout to clear cookie.');
  }
}
