import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendShipmentUpdateEmail } from '@/lib/server/email';
import { publicEnv } from '@/lib/env/public';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';

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

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  const { supabase } = createSupabaseRouteClient(request);
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
    .select('id,reference_number,status,company_id,customer_id')
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
  const [{ data: customerProfile }, { data: company }] = await Promise.all([
    supabaseAdmin.from('profiles').select('email').eq('id', shipmentRow.customer_id).single(),
    supabaseAdmin.from('companies').select('name').eq('id', shipmentRow.company_id).single(),
  ]);

  const to = (customerProfile as ProfileEmailRow | null)?.email ?? undefined;
  const companyName = (company as CompanyNameRow | null)?.name || 'AFGHCO';

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const trackingUrl = `${appUrl}/tracking?ref=${encodeURIComponent(shipmentRow.reference_number)}`;

  if (to) {
    await sendShipmentUpdateEmail({
      to,
      companyName,
      referenceNumber: shipmentRow.reference_number,
      status,
      updateTitle: 'Shipment status updated',
      updateBody: null,
      trackingUrl,
    }).catch((err) => console.warn('sendShipmentUpdateEmail failed', err));
  }

  return NextResponse.json({ ok: true, shipment: updated });
}

