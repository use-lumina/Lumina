import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protect the dashboard app pages by requiring an httpOnly `lumina_token` cookie.
// If the cookie is missing, redirect to `/auth` and include the original
// path in `from` query param so the client can return after login.
//
// For self-hosted deployments (AUTH_REQUIRED=false), authentication is disabled
// and the dashboard is open to all users.

const PUBLIC_PATHS = ['/auth', '/favicon.ico'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and Next.js internal assets to pass through
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // allow files like robots.txt, images, etc.
  ) {
    return NextResponse.next();
  }

  // Check if authentication is required (managed cloud vs self-hosted)
  const authRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRED === 'true';

  // Self-hosted mode: no authentication required
  if (!authRequired) {
    return NextResponse.next();
  }

  // Managed cloud mode: check for authentication token
  const token = req.cookies.get('lumina_token')?.value;

  if (!token) {
    const loginUrl = new URL('/auth', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Run middleware for all routes in this app (we handle exclusions above).
export const config = {
  matcher: '/:path*',
};
