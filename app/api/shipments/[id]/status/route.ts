import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendShipmentStatusUpdatedEmail } from '@/lib/server/mailer';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';

const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

type ShipmentLookupRow = {
  id: string;
  reference_number: string;
  status: string;
  company_id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  destination_address?: string | null;
  origin_address?: string | null;
};

type ProfileEmailRow = { email: string | null };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  const { supabase } = await createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const effectiveUserId = user.id;

  const { data: me, error: meErr } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', effectiveUserId)
    .maybeSingle();

  if (meErr) {
    return NextResponse.json({ ok: false, error: meErr.message }, { status: 500 });
  }

  const role = (me as { role?: string } | null)?.role ?? null;
  if (role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data: shipment, error: shipmentErr } = await supabaseAdmin
    .from('shipments')
    .select('id,reference_number,status,company_id,customer_id,customer_name,customer_email,destination_address,origin_address')
    .eq('id', id)
    .single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ ok: false, error: shipmentErr?.message || 'Shipment not found' }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('shipments')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ ok: false, error: updateErr?.message || 'Update failed' }, { status: 500 });
  }

  if (effectiveUserId) {
    try {
      await supabaseAdmin.from('shipment_events').insert({
        shipment_id: id,
        event_type: 'status_change',
        notes: `Status set to ${status}`,
        created_by: effectiveUserId,
      });
    } catch {
      // ignore
    }
  }

  const shipmentRow = shipment as ShipmentLookupRow;
  const [{ data: customerProfile }] = await Promise.all([
    shipmentRow.customer_email
      ? Promise.resolve({ data: null })
      : supabaseAdmin.from('profiles').select('email').eq('id', shipmentRow.customer_id).single(),
  ]);

  const to =
    shipmentRow.customer_email ||
    (customerProfile as ProfileEmailRow | null)?.email ||
    undefined;

  if (to) {
    void sendShipmentStatusUpdatedEmail({
      to,
      referenceNumber: shipmentRow.reference_number,
      customerName: shipmentRow.customer_name ?? undefined,
      originAddress: shipmentRow.origin_address ?? undefined,
      statusLabel: status,
      locationLabel: status === 'delivered' ? 'Delivered' : 'Status update',
      eventTime: new Date().toISOString(),
      eventNotes: shipmentRow.customer_name ? `Hello ${shipmentRow.customer_name},` : undefined,
      destinationAddress: shipmentRow.destination_address ?? undefined,
      deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
    }).catch((err) => console.warn('sendShipmentStatusUpdatedEmail failed', err));
  } else {
    console.warn('Shipment status update missing customer_email; skipping email');
  }

  return NextResponse.json({ ok: true, shipment: updated });
}

