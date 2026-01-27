import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions, SetAllCookies } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

import { getPublicEnv } from '@/lib/env/public';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const redirectToParam = url.searchParams.get('redirectTo');
  const redirectTo = (() => {
    const fallback = '/dashboard';
    if (!redirectToParam) return fallback;

    const value = redirectToParam.trim();

    // Only allow same-origin relative redirects to avoid open-redirects.
    if (!value.startsWith('/')) return fallback;
    if (value.startsWith('//')) return fallback;
    if (value.includes('\\')) return fallback;

    return value;
  })();

  let response = NextResponse.redirect(new URL(redirectTo, request.url));

  const env = getPublicEnv();
  if (!env) {
    return response;
  }

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.redirect(new URL(redirectTo, request.url));

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
