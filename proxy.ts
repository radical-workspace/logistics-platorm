import { createServerClient } from '@supabase/ssr';
import type { CookieOptions, SetAllCookies } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicEnv } from '@/lib/env/public';

const protectedRoutes = ['/admin', '/dashboard', '/dispatcher'];
const authRoutes = [
  '/auth',
  '/auth/login',
  '/auth/register',
  '/auth/reset',
  '/dashboard/auth',
  '/dashboard/auth/login',
  '/dashboard/auth/register',
  '/dashboard/auth/reset',
  '/dashboard/auth/update-password',
];

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get('x-request-id') || crypto.randomUUID();
  requestHeaders.set('x-request-id', requestId);
  if (request.nextUrl.pathname.startsWith('/dashboard/auth')) {
    requestHeaders.set('x-dashboard-auth', '1');
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', requestId);

  const env = getPublicEnv();
  if (!env) return response;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');

  const projectRef = (() => {
    try {
      return new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0];
    } catch {
      return '';
    }
  })();

  const authTokenCookie = projectRef ? request.cookies.get(`sb-${projectRef}-auth-token`)?.value : undefined;
  let authToken = undefined as string | undefined;
  if (authTokenCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authTokenCookie)) as { currentSession?: { access_token?: string } };
      authToken = parsed.currentSession?.access_token;
    } catch {
      authToken = undefined;
    }
  }

  const supabaseAccessToken =
    authToken ||
    request.headers.get('authorization')?.replace(/Bearer\s+/i, '') ||
    request.cookies.get('sb-access-token')?.value ||
    (projectRef ? request.cookies.get(`sb-${projectRef}-access-token`)?.value : undefined);

  const userIdFromJwt = (() => {
    if (!supabaseAccessToken) return null;
    const parts = supabaseAccessToken.split('.');
    if (parts.length < 2) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as { sub?: string };
      return payload.sub || null;
    } catch {
      return null;
    }
  })();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: supabaseAccessToken ? { Authorization: `Bearer ${supabaseAccessToken}` } : {},
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        response.headers.set('x-request-id', requestId);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user || !!userIdFromJwt || !!supabaseAccessToken;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    redirect.headers.set('x-request-id', requestId);
    return redirect;
  }

  // Redirect unauthenticated users away from protected pages.
  // Exclude /dashboard/auth/* to avoid redirect loops.
  if (!isAuthenticated && isProtectedRoute && !isAuthRoute) {
    const redirect = NextResponse.redirect(new URL(isAdminRoute ? '/login' : '/dashboard/auth/login', request.url));
    redirect.headers.set('x-request-id', requestId);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
