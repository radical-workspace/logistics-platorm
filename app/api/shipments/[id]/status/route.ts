import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendShipmentUpdateEmail } from '@/lib/email';

const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

type ShipmentLookupRow = {
  id: string;
  reference_number: string;
  status: string;
  company_id: string;
  customer_id: string;
};

type ProfileEmailRow = { email: string | null };
type CompanyNameRow = { name: string | null };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = (body?.status || '').trim();

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { supabase, response } = createSupabaseRouteClient(request);

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

  // RLS-gated read proves access.
  const { data: shipment, error: shipmentErr } = await supabase
    .from('shipments')
    .select('id,reference_number,status,company_id,customer_id')
    .eq('id', id)
    .single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('shipments')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Insert an event (created_by enforced in DB trigger).
  await supabase.from('shipment_events').insert({
    shipment_id: id,
    event_type: 'status_change',
    notes: `Status set to ${status}`,
  });

  // Email the customer (use admin for lookups; access already verified by RLS).
  const shipmentRow = shipment as ShipmentLookupRow;
  const [{ data: customerProfile }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', shipmentRow.customer_id)
      .single(),
    supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', shipmentRow.company_id)
      .single(),
  ]);

  const to = (customerProfile as ProfileEmailRow | null)?.email ?? undefined;
  const companyName = (company as CompanyNameRow | null)?.name || 'AFGHCO';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const trackingUrl = `${appUrl}/?ref=${encodeURIComponent(shipmentRow.reference_number)}#tracking`;

  if (to) {
    await sendShipmentUpdateEmail({
      to,
      companyName,
      referenceNumber: shipmentRow.reference_number,
      status,
      updateTitle: 'Shipment status updated',
      updateBody: null,
      trackingUrl,
    });
  }

  return NextResponse.json({ shipment: updated }, { headers: response.headers });
}
