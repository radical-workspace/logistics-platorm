
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendShipmentStatusUpdatedEmail } from '@/lib/server/mailer';

const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

type AdminShipmentUpdateBody = {
  status?: unknown;
  current_location_label?: unknown;
  current_latitude?: unknown;
  current_longitude?: unknown;
  current_lat?: unknown;
  current_lng?: unknown;
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  assigned_dispatcher_id?: unknown;
  notes?: unknown;
};

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => ({}))) as AdminShipmentUpdateBody;

  if (body.lat == null && body.latitude != null) body.lat = body.latitude;
  if (body.lng == null && body.longitude != null) body.lng = body.longitude;
  if (body.lat == null && body.current_latitude != null) body.lat = body.current_latitude;
  if (body.lng == null && body.current_longitude != null) body.lng = body.current_longitude;
  if (body.lat == null && body.current_lat != null) body.lat = body.current_lat;
  if (body.lng == null && body.current_lng != null) body.lng = body.current_lng;

  const rawStatus = String(body.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const status = rawStatus ? rawStatus : null;

  if (status && !allowedStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  const locationLabel = String(body.current_location_label ?? '').trim().slice(0, 140) || null;
  const latitude =
    body.lat === "" || body.lat == null ? null : Number(body.lat);
  const longitude =
    body.lng === "" || body.lng == null ? null : Number(body.lng);

  if (latitude !== null && Number.isNaN(latitude)) {
    return Response.json({ error: "Invalid latitude" }, { status: 400 });
  }
  if (longitude !== null && Number.isNaN(longitude)) {
    return Response.json({ error: "Invalid longitude" }, { status: 400 });
  }

  const assignedDispatcherRaw = String(body.assigned_dispatcher_id ?? '').trim();
  const assigned_dispatcher_id = assignedDispatcherRaw ? assignedDispatcherRaw : null;
  const notes = String(body.notes ?? '').trim().slice(0, 500) || null;

  if (assigned_dispatcher_id && !/^[0-9a-fA-F-]{36}$/.test(assigned_dispatcher_id)) {
    return NextResponse.json({ ok: false, error: 'Invalid assigned_dispatcher_id' }, { status: 400 });
  }

  if (latitude !== null && longitude === null) {
    return NextResponse.json({ ok: false, error: 'lng is required when lat is provided' }, { status: 400 });
  }
  if (longitude !== null && latitude === null) {
    return NextResponse.json({ ok: false, error: 'lat is required when lng is provided' }, { status: 400 });
  }

  if (!status && !locationLabel && latitude === null && longitude === null && !assigned_dispatcher_id && !notes) {
    return NextResponse.json({ ok: false, error: 'Missing update fields' }, { status: 400 });
  }

  const { supabase, response } = await createSupabaseRouteClient(request);
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

  const currentDispatcher = ((shipment as { assigned_dispatcher_id?: unknown } | null)?.assigned_dispatcher_id ?? null) as string | null;
  const dispatcherToApply =
    assigned_dispatcher_id !== null && assigned_dispatcher_id !== (currentDispatcher ?? null)
      ? assigned_dispatcher_id
      : null;

  if (!statusToApply && !locationLabel && latitude === null && longitude === null && !dispatcherToApply && !notes) {
    return NextResponse.json({ ok: false, error: 'No changes provided' }, { status: 400, headers: response.headers });
  }

  const shipmentUpdate: Record<string, unknown> = {};
  if (statusToApply) shipmentUpdate.status = statusToApply;
  if (locationLabel) shipmentUpdate.current_location_label = locationLabel;
  if (latitude !== null && longitude !== null) {
    shipmentUpdate.current_lat = latitude;
    shipmentUpdate.current_lng = longitude;
    shipmentUpdate.last_event_at = new Date().toISOString();
  }
  if (dispatcherToApply !== null) shipmentUpdate.assigned_dispatcher_id = dispatcherToApply;

  if (Object.keys(shipmentUpdate).length > 0) {
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('shipments')
      .update(shipmentUpdate)
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

  const event_type = statusToApply ?? (dispatcherToApply !== null ? 'dispatcher_assignment' : 'location_update');

  const { data: event, error: eventErr } = await supabaseAdmin
    .from('shipment_events')
    .insert({
      shipment_id: id,
      event_type,
      latitude,
      longitude,
      notes:
        combinedNotes ??
        (dispatcherToApply !== null ? `Assigned dispatcher=${dispatcherToApply || 'none'}` : null),
      created_by: user.id,
    })
    .select('id,shipment_id,event_type,latitude,longitude,notes,created_by,created_at')
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ ok: false, error: eventErr?.message || 'Failed to create event' }, { status: 500, headers: response.headers });
  }

  const shipmentRow = shipment as {
    reference_number?: string | null;
    company_id?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
  };

  const [{ data: customerProfile }] = await Promise.all([
    shipmentRow.customer_email
      ? Promise.resolve({ data: null })
      : shipmentRow.customer_id
        ? supabaseAdmin.from('profiles').select('email').eq('id', shipmentRow.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
  ]);

  const to =
    shipmentRow.customer_email ||
    (customerProfile as { email?: string | null } | null)?.email ||
    undefined;

  if (to && (statusToApply || locationLabel || latitude !== null || longitude !== null || notes)) {
    void sendShipmentStatusUpdatedEmail({
      to,
      referenceNumber: shipmentRow.reference_number || id,
      customerName: shipmentRow.customer_name ?? undefined,
      originAddress: (shipment as { origin_address?: string | null }).origin_address ?? undefined,
      destinationAddress: (shipment as { destination_address?: string | null }).destination_address ?? undefined,
      statusLabel: statusToApply || currentStatus || 'in_transit',
      locationLabel: locationLabel || (statusToApply ? `Status changed to ${statusToApply}` : 'Location update'),
      eventTime: (event as { created_at?: string | null } | null)?.created_at ?? new Date().toISOString(),
      eventNotes: combinedNotes || notes || undefined,
      deliveredAt:
        statusToApply === 'delivered'
          ? (updatedShipment as { actual_delivery?: string | null }).actual_delivery ?? new Date().toISOString()
          : undefined,
    }).catch((err) => console.warn('sendShipmentStatusUpdatedEmail failed', err));
  } else if (!to) {
    console.warn('Shipment update missing customer_email; skipping email');
  }

  return NextResponse.json({ ok: true, shipment: updatedShipment, event }, { status: 200, headers: response.headers });
}
