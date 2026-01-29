import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { shipmentSchema } from '@/lib/shared/validators';

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

  const { supabase, response } = await createSupabaseRouteClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectRef = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host.split('.')[0];
    } catch {
      return '';
    }
  })();
  const authTokenCookie = projectRef ? request.cookies.get(`sb-${projectRef}-auth-token`)?.value : undefined;
  let tokenUserId: string | null = null;
  if (authTokenCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authTokenCookie)) as { currentSession?: { access_token?: string } };
      const access = parsed.currentSession?.access_token;
      if (access) {
        const parts = access.split('.');
        if (parts.length > 1) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as { sub?: string };
          tokenUserId = payload.sub ?? null;
        }
      }
    } catch {
      tokenUserId = null;
    }
  }

  if (!user && !tokenUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user?.id ?? tokenUserId ?? '')
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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        customer_id?: unknown;
        customer_name?: unknown;
        customer_email?: unknown;
        customer_phone?: unknown;
        reference_number?: unknown;
        origin_address?: unknown;
        destination_address?: unknown;
        weight_kg?: unknown;
        description?: unknown;
        estimated_delivery?: unknown;
      }
    | null;

  const { supabase, response } = await createSupabaseRouteClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: response.headers });
  }

  const { data: me, error: meError } = await supabaseAdmin
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (meError) {
    return NextResponse.json({ error: meError.message }, { status: 500, headers: response.headers });
  }

  const meRow = me as { id: string; role: string; company_id: string | null } | null;
  const role = meRow?.role;
  const companyId = meRow?.company_id ?? null;

  if (!role) {
    return NextResponse.json({ error: 'Profile missing' }, { status: 403, headers: response.headers });
  }

  if (role !== 'admin' && role !== 'dispatcher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: response.headers });
  }

  if (!companyId) {
    return NextResponse.json({ error: 'Missing company on profile' }, { status: 400, headers: response.headers });
  }

  const customer_id = String(body?.customer_id ?? '').trim();
  const customer_name = String(body?.customer_name ?? '').trim();
  const customer_email = String(body?.customer_email ?? '').trim();
  const customer_phone = String(body?.customer_phone ?? '').trim();
  const reference_number = String(body?.reference_number ?? '').trim();
  const origin_address = String(body?.origin_address ?? '').trim();
  const destination_address = String(body?.destination_address ?? '').trim();
  const description = String(body?.description ?? '').trim().slice(0, 500);
  const estimated_delivery = String(body?.estimated_delivery ?? '').trim();

  const weightRaw = body?.weight_kg;
  const weight_kg =
    weightRaw === null || weightRaw === undefined || weightRaw === ''
      ? undefined
      : typeof weightRaw === 'number'
        ? weightRaw
        : Number(String(weightRaw));

  try {
    shipmentSchema.parse({
      origin_address,
      destination_address,
      weight_kg: weight_kg ?? 1,
      description: description || undefined,
      estimated_delivery: estimated_delivery || undefined,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid shipment';
    return NextResponse.json({ error: message }, { status: 400, headers: response.headers });
  }

  if (
    !customer_id ||
    !customer_name ||
    !customer_email ||
    !reference_number ||
    !origin_address ||
    !destination_address
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: response.headers });
  }

  // Dispatchers are scoped to their own company.
  const insertCompanyId = companyId;

  const { data: created, error: createErr } = await supabaseAdmin
    .from('shipments')
    .insert({
      company_id: insertCompanyId,
      customer_id,
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      reference_number,
      origin_address,
      destination_address,
      weight_kg: Number.isFinite(weight_kg as number) ? (weight_kg as number) : null,
      description: description || null,
      estimated_delivery: estimated_delivery ? new Date(estimated_delivery).toISOString() : null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (createErr || !created?.id) {
    return NextResponse.json({ error: createErr?.message || 'Create failed' }, { status: 400, headers: response.headers });
  }

  return NextResponse.json({ id: created.id }, { status: 200, headers: response.headers });
}

