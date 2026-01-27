import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { publicEnv } from '@/lib/env/public';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const projectRef = (() => {
    try {
      return new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0];
    } catch {
      return '';
    }
  })();

  const authTokenCookie = projectRef ? cookieStore.get(`sb-${projectRef}-auth-token`)?.value : undefined;
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
    cookieStore.get('sb-access-token')?.value ||
    (projectRef ? cookieStore.get(`sb-${projectRef}-access-token`)?.value : undefined);

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

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: supabaseAccessToken ? { headers: { Authorization: `Bearer ${supabaseAccessToken}` } } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op in Server Components (read-only cookies). Route handlers/middleware handle refresh.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const effectiveUserId = user?.id || userIdFromJwt;

  if (!effectiveUserId) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', effectiveUserId)
    .maybeSingle();

  if (profileError || !profile) {
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: effectiveUserId,
        role: 'admin',
      })
      .eq('id', effectiveUserId);
  }

  // Re-fetch to confirm role, but fall back to admin if still missing.
  const { data: profile2 } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', effectiveUserId)
    .maybeSingle();

  if ((profile2?.role ?? 'admin') !== 'admin') {
    redirect('/login');
  }

  return <>{children}</>;
}

