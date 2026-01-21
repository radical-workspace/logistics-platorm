import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import DashboardShell from '@/app/dashboard/DashboardShell';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  if (!user) {
    redirect('/dashboard/auth/login');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-black">Profile missing</h1>
        <p className="mt-2 text-slate-400">
          Your account exists, but no profile row was found. Contact support.
        </p>
      </main>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-black">Forbidden</h1>
        <p className="mt-2 text-slate-400">Admin access is required.</p>
      </main>
    );
  }

  return (
    <DashboardShell initialUserEmail={user.email} initialRole={profile.role}>
      {children}
    </DashboardShell>
  );
}
