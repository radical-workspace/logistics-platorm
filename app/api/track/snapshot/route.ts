import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get('ref') || '').trim();

  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
  if (ref.length > 80) return NextResponse.json({ error: 'Invalid ref' }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('track_shipment', {
    p_reference_number: ref,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = Array.isArray(data) ? data[0] ?? null : data ?? null;
  if (!row?.shipment_id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ row });
}
