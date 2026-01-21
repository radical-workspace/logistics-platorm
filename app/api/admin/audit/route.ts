import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { supabaseAdmin } from '@/lib/supabase-admin';

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseRouteClient(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, resource_type, resource_id, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const auditRows = (rows ?? []) as AuditRow[];
    const userIds = Array.from(new Set(auditRows.map((row) => row.user_id).filter(Boolean))) as string[];

    const profileMap = new Map<string, { display_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);

      for (const row of (profileRows ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>) {
        profileMap.set(row.id, { display_name: row.display_name, email: row.email });
      }
    }

    const audit = auditRows.map((row) => {
      const actor = row.user_id ? profileMap.get(row.user_id) : null;
      return {
        ...row,
        actor: actor?.display_name || actor?.email || (row.user_id ? row.user_id : 'System'),
      };
    });

    return NextResponse.json({ audit }, { headers: response.headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
