import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';

type TrackShipmentRow = {
  shipment_id: string;
  reference_number: string;
  status: string;
  origin_address: string;
  origin_lat: string | number | null;
  origin_lng: string | number | null;
  destination_address: string;
  dest_lat: string | number | null;
  dest_lng: string | number | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  last_event_type: string | null;
  last_event_notes: string | null;
  last_event_at: string | null;
  last_event_lat: string | number | null;
  last_event_lng: string | number | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get('ref') || '').trim();

  if (!ref) {
    return NextResponse.json({ data: null, error: 'Missing ref' }, { status: 400 });
  }
  if (ref.length > 80) {
    return NextResponse.json({ data: null, error: 'Invalid ref' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('track_shipment', { p_reference_number: ref });
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });

  const row = (Array.isArray(data) ? (data[0] ?? null) : (data ?? null)) as TrackShipmentRow | null;
  if (!row?.shipment_id) {
    return NextResponse.json({ data: null, error: null }, { status: 200 });
  }

  return NextResponse.json({ data: row, error: null }, { status: 200 });
}

