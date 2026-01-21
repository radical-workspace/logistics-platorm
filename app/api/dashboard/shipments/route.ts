import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';

const PAGE_SIZE = 20;
const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

function clampPage(value: string | null) {
  const parsed = Number.parseInt(value || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = clampPage(url.searchParams.get('page'));
  const statusParam = (url.searchParams.get('status') || '').trim();
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);

  const status = allowedStatuses.has(statusParam) ? statusParam : null;

  const { supabase, response } = createSupabaseRouteClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (meError) {
    return NextResponse.json({ error: meError.message }, { status: 400 });
  }

  const meRow = me as { id: string; role: string; company_id: string | null } | null;
  const role = meRow?.role;
  const companyId = meRow?.company_id ?? null;

  if (!role) {
    return NextResponse.json({ error: 'Profile missing' }, { status: 403 });
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let query = supabase
    .from('shipments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (role === 'dispatcher' && companyId) {
    query = query.eq('company_id', companyId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.ilike('reference_number', `%${q}%`);
  }

  const { data, error, count } = await query.range(start, end);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return NextResponse.json(
    {
      shipments: data ?? [],
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
    },
    { headers: response.headers }
  );
}
