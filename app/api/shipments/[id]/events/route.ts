import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendShipmentUpdateEmail } from '@/lib/server/email';
import { publicEnv } from '@/lib/env/public';

type ShipmentLookupRow = {
  id: string;
  reference_number: string;
  status: string;
  company_id: string;
  customer_id: string | null;
  customer_email: string | null;
};

type ProfileEmailRow = { email: string | null };
type CompanyNameRow = { name: string | null };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    event_type?: string;
    notes?: string | null;
    latitude?: unknown;
    longitude?: unknown;
    lat?: unknown;
    lng?: unknown;
  } | null;
  const eventType = (body?.event_type || '').trim();
  const notes = (body?.notes || '').trim();
  const rawLat = body?.latitude ?? body?.lat ?? null;
  const rawLng = body?.longitude ?? body?.lng ?? null;
  let latitude =
    rawLat === '' || rawLat == null ? null : Number(String(rawLat));
  let longitude =
    rawLng === '' || rawLng == null ? null : Number(String(rawLng));

  if (latitude !== null && Number.isNaN(latitude)) latitude = null;
  if (longitude !== null && Number.isNaN(longitude)) longitude = null;

  if (!eventType) {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
  }

  const { supabase, response } = await createSupabaseRouteClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS-gated read proves access.
  const { data: shipment, error: shipmentErr } = await supabase
    .from('shipments')
    .select('id,reference_number,status,company_id,customer_id,customer_email')
    .eq('id', id)
    .single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  if ((latitude === null || longitude === null) && notes) {
    const { data: lastWithCoords } = await supabaseAdmin
      .from('shipment_events')
      .select('latitude,longitude')
      .eq('shipment_id', id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastWithCoords?.latitude != null && lastWithCoords?.longitude != null) {
      latitude = Number(lastWithCoords.latitude);
      longitude = Number(lastWithCoords.longitude);
    }
  }

  const { error: insertErr } = await supabase.from('shipment_events').insert({
    shipment_id: id,
    event_type: eventType,
    notes: notes || null,
    latitude,
    longitude,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  const shipmentRow = shipment as ShipmentLookupRow;
  const [{ data: customerProfile }, { data: company }] = await Promise.all([
    shipmentRow.customer_email || !shipmentRow.customer_id
      ? Promise.resolve({ data: null })
      : supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', shipmentRow.customer_id)
          .maybeSingle(),
    supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', shipmentRow.company_id)
      .single(),
  ]);

  const to =
    shipmentRow.customer_email ||
    (customerProfile as ProfileEmailRow | null)?.email ||
    undefined;
  const companyName = (company as CompanyNameRow | null)?.name || 'AFGHCO';

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const trackingUrl = `${appUrl}/?ref=${encodeURIComponent(shipmentRow.reference_number)}#tracking`;

  if (to) {
    try {
      await sendShipmentUpdateEmail({
        to,
        companyName,
        referenceNumber: shipmentRow.reference_number,
        status: shipmentRow.status,
        updateTitle: 'Shipment update',
        updateBody: `${eventType}${notes ? ` - ${notes}` : ''}`,
        trackingUrl,
      });
    } catch (err) {
      console.warn('sendShipmentUpdateEmail failed', err);
    }
  }

  return NextResponse.json({ ok: true }, { headers: response.headers });
}

