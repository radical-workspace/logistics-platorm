import { createServerClient } from '@supabase/ssr';
import type { CookieOptions, SetAllCookies } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

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
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users away from protected pages.
  // Exclude /dashboard/auth/* to avoid redirect loops.
  if (!user && isProtectedRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL(isAdminRoute ? '/login' : '/dashboard/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
