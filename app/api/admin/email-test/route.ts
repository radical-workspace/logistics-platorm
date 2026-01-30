import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { sendShipmentCreatedEmail, sendShipmentStatusUpdatedEmail } from '@/lib/server/mailer';

type EmailTestBody = {
  to?: unknown;
  kind?: unknown;
  reference_number?: unknown;
  customer_name?: unknown;
  origin_address?: unknown;
  destination_address?: unknown;
  status_label?: unknown;
  estimated_delivery?: unknown;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as EmailTestBody | null;
  const kind = String(body?.kind ?? 'created').trim().toLowerCase();

  const { supabase, response } = await createSupabaseRouteClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: response.headers });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role,email,display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500, headers: response.headers });
  }

  const role = (profile as { role?: string } | null)?.role ?? null;
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: response.headers });
  }

  const fallbackTo = (profile as { email?: string | null } | null)?.email ?? '';
  const to = String(body?.to ?? fallbackTo).trim();
  if (!to) {
    return NextResponse.json({ error: 'Recipient email is required' }, { status: 400, headers: response.headers });
  }

  const referenceNumber = String(body?.reference_number ?? `EMAIL-TEST-${Date.now()}`).trim();
  const customerName = String(body?.customer_name ?? (profile as { display_name?: string | null } | null)?.display_name ?? 'Customer').trim();
  const originAddress = String(body?.origin_address ?? 'Kabul, Afghanistan').trim();
  const destinationAddress = String(body?.destination_address ?? 'Herat, Afghanistan').trim();
  const statusLabel = String(body?.status_label ?? 'in_transit').trim();
  const estimatedDelivery = String(body?.estimated_delivery ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()).trim();
  const now = new Date().toISOString();

  try {
    if (kind === 'update' || kind === 'delivered') {
      const statusToSend = kind === 'delivered' ? 'delivered' : statusLabel;
      await sendShipmentStatusUpdatedEmail({
        to,
        referenceNumber,
        customerName,
        originAddress,
        destinationAddress,
        statusLabel: statusToSend,
        locationLabel: kind === 'delivered' ? 'Delivered' : 'Status update',
        eventNotes: kind === 'delivered' ? 'Delivered successfully.' : 'Email test update.',
        eventTime: now,
        deliveredAt: kind === 'delivered' ? now : undefined,
      });
    } else {
      await sendShipmentCreatedEmail({
        to,
        referenceNumber,
        customerName,
        originAddress,
        destinationAddress,
        statusLabel: 'Pending',
        estimatedDelivery,
        eventTime: now,
        locationLabel: 'Shipment created',
        eventNotes: 'Email test created.',
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email send failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: response.headers });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: response.headers });
}
