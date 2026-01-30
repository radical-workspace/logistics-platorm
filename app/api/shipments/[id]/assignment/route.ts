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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as
    | { assigned_driver_id?: string | null; assigned_vehicle_id?: string | null }
    | null;

  const driver = (body?.assigned_driver_id || '').trim();
  const vehicle = (body?.assigned_vehicle_id || '').trim();

  const assigned_driver_id = driver ? driver : null;
  const assigned_vehicle_id = vehicle ? vehicle : null;

  const { supabase, response } = await createSupabaseRouteClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: me } = await supabase.from('profiles').select('id,role').eq('id', user.id).single();
  const role = (me as { role?: string } | null)?.role;

  if (role !== 'admin' && role !== 'dispatcher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: shipment, error: shipmentErr } = await supabase
    .from('shipments')
    .select('id,reference_number,status,company_id,customer_id,customer_email')
    .eq('id', id)
    .single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('shipments')
    .update({ assigned_driver_id, assigned_vehicle_id })
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  await supabase.from('shipment_events').insert({
    shipment_id: id,
    event_type: 'assignment_change',
    notes: `Assigned driver=${assigned_driver_id ?? 'none'} vehicle=${assigned_vehicle_id ?? 'none'}`,
  });

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
        updateTitle: 'Shipment assignment updated',
        updateBody: null,
        trackingUrl,
      });
    } catch (err) {
      console.warn('sendShipmentUpdateEmail failed', err);
    }
  }

  return NextResponse.json({ shipment: updated }, { headers: response.headers });
}

