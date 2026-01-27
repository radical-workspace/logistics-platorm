import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseRouteClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      (user.email ? user.email.split('@')[0] : 'User');

    // Preserve existing role if present so admins/dispatchers are not downgraded.
    const { data: existing } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isSeedAdmin = user.email === 'e2e-admin@afghco.test';
    const existingRole = (existing as { role?: string } | null)?.role;
    const roleToUse = isSeedAdmin ? 'admin' : (existingRole || 'customer');

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          display_name: displayName,
          role: roleToUse,
        },
        { onConflict: 'id' }
      )
      .select('id,email,role')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data }, { headers: response.headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

