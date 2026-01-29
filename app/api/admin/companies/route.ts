import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  const { supabase, response } = await createSupabaseRouteClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: response.headers });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500, headers: response.headers });
  }

  const role = (profile as { role?: string } | null)?.role ?? null;
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: response.headers });
  }

  const { data, error } = await supabaseAdmin.from('companies').select('id,name').order('name');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: response.headers });
  }

  return NextResponse.json({ companies: data ?? [] }, { headers: response.headers });
}
