import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions, SetAllCookies } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { publicEnv } from '@/lib/env/public';

export function createSupabaseRouteClient(request?: NextRequest) {
  let response = new NextResponse(null);
  const cookieStore = cookies();
  const headerStore = headers();

  const supabaseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const projectRef = (() => {
    try {
      return new URL(supabaseUrl).host.split('.')[0];
    } catch {
      return '';
    }
  })();

  const authTokenCookie = projectRef ? cookieStore.get(`sb-${projectRef}-auth-token`)?.value : undefined;
  let authToken = undefined as string | undefined;
  if (authTokenCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authTokenCookie)) as {
        currentSession?: { access_token?: string };
      };
      authToken = parsed.currentSession?.access_token;
    } catch {
      authToken = undefined;
    }
  }

  const authHeader = headerStore.get('authorization') ?? request?.headers.get('authorization') ?? null;

  const bearerToken =
    authToken ||
    authHeader?.replace(/Bearer\s+/i, '') ||
    cookieStore.get('sb-access-token')?.value ||
    (projectRef ? cookieStore.get(`sb-${projectRef}-access-token`)?.value : undefined);

  if (process.env.NODE_ENV !== 'production') {
    const authCookies = cookieStore
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.startsWith('sb-'));
    console.info('[auth cookies]', {
      path: request?.nextUrl?.pathname ?? 'unknown',
      cookies: authCookies,
    });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        response = new NextResponse(null);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  return { supabase, response };
}
