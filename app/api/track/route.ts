import { NextResponse } from 'next/server';
import { createSupabasePublicServerClient } from '@/lib/supabase-public-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();

  if (!ref) {
    return NextResponse.json({ data: null, error: 'Missing ref' }, { status: 400 });
  }

  if (ref.length > 80) {
    return NextResponse.json({ data: null, error: 'Invalid ref' }, { status: 400 });
  }

  const supabase = createSupabasePublicServerClient();

  const { data, error } = await supabase.rpc('track_shipment', {
    p_reference_number: ref,
  });

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] ?? null : data ?? null;

  return NextResponse.json({ data: row, error: null });
}
