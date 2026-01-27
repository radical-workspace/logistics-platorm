import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env/server';

// Use the same URL as the browser/SSR clients to avoid mismatched URL/key pairs.
// (A globally-set SUPABASE_URL can accidentally point to a different project.)
const supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

function getProjectRefFromUrl(url: string) {
  try {
    return new URL(url).host.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

function getRefFromJwt(jwt: string) {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as { ref?: string; role?: string };
    return { ref: payload.ref ?? null, role: payload.role ?? null };
  } catch {
    return null;
  }
}

// Fail fast if the service role key doesn't belong to the configured Supabase project.
// This prevents confusing runtime "Invalid API key" errors in API routes.
const expectedRef = getProjectRefFromUrl(supabaseUrl);
const jwtRef = getRefFromJwt(serviceRoleKey);
if (expectedRef && jwtRef?.ref && expectedRef !== jwtRef.ref) {
  throw new Error(`SUPABASE_SERVICE_ROLE_KEY ref mismatch (url=${expectedRef}, key=${jwtRef.ref})`);
}

// Server-only: bypasses RLS. Only use after server-side authorization.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
