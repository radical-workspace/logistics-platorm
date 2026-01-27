import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

type AdminShipmentUpdateBody = {
  status?: unknown;
  current_location_label?: unknown;
  current_lat?: unknown;
  current_lng?: unknown;
  notes?: unknown;
};

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as AdminShipmentUpdateBody | null;

  const rawStatus = String(body?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const status = rawStatus ? rawStatus : null;

  if (status && !allowedStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  const locationLabel = String(body?.current_location_label ?? '').trim().slice(0, 140) || null;
  const lat = parseOptionalNumber(body?.current_lat);
  const lng = parseOptionalNumber(body?.current_lng);
  const notes = String(body?.notes ?? '').trim().slice(0, 500) || null;

  if (lat !== null && lng === null) {
    return NextResponse.json({ ok: false, error: 'current_lng is required when current_lat is provided' }, { status: 400 });
  }
  if (lng !== null && lat === null) {
    return NextResponse.json({ ok: false, error: 'current_lat is required when current_lng is provided' }, { status: 400 });
  }

  if (!status && !locationLabel && lat === null && lng === null && !notes) {
    return NextResponse.json({ ok: false, error: 'Missing update fields' }, { status: 400 });
  }

  const { supabase, response } = createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: response.headers });
  }

  const { data: adminProfile, error: adminProfileErr } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle();

  if (adminProfileErr) {
    return NextResponse.json({ ok: false, error: adminProfileErr.message }, { status: 500, headers: response.headers });
  }

  if ((adminProfile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403, headers: response.headers });
  }

  const { data: shipment, error: shipmentErr } = await supabaseAdmin.from('shipments').select('*').eq('id', id).single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ ok: false, error: shipmentErr?.message || 'Shipment not found' }, { status: 404, headers: response.headers });
  }

  let updatedShipment = shipment;

  const currentStatus = String((shipment as { status?: unknown } | null)?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const statusToApply = status && status !== currentStatus ? status : null;

  if (!statusToApply && !locationLabel && lat === null && lng === null && !notes) {
    return NextResponse.json({ ok: false, error: 'No changes provided' }, { status: 400, headers: response.headers });
  }

  if (statusToApply) {
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('shipments')
      .update({ status: statusToApply })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ ok: false, error: updateErr?.message || 'Update failed' }, { status: 500, headers: response.headers });
    }

    updatedShipment = updated;
  }

  const combinedNotes = (() => {
    const parts = [locationLabel, notes].filter(Boolean) as string[];
    if (parts.length === 0) return null;
    return parts.join(' — ').slice(0, 500);
  })();

  const event_type = statusToApply ?? 'location_update';

  const { data: event, error: eventErr } = await supabaseAdmin
    .from('shipment_events')
    .insert({
      shipment_id: id,
      event_type,
      latitude: lat,
      longitude: lng,
      notes: combinedNotes,
      created_by: user.id,
    })
    .select('id,shipment_id,event_type,latitude,longitude,notes,created_by,created_at')
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ ok: false, error: eventErr?.message || 'Failed to create event' }, { status: 500, headers: response.headers });
  }

  return NextResponse.json({ ok: true, shipment: updatedShipment, event }, { status: 200, headers: response.headers });
}
