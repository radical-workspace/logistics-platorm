import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { supabaseAdmin } from '@/lib/supabase-admin';

type OverviewStats = {
  shipmentsTotal: number;
  inTransit: number;
  delivered: number;
  pending: number;
  vehicleCount: number;
};

type ProfileSummary = {
  email: string;
  display_name: string | null;
  role: string;
};

type RecentShipmentRow = {
  id: string;
  reference_number: string;
  status: string;
  destination_address: string;
  updated_at: string;
};

type RecentEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  notes: string | null;
  shipment_id: string;
};

type ShipmentRefRow = { id: string; reference_number: string };

export async function GET(request: NextRequest) {
  const { supabase, response } = createSupabaseRouteClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message || 'Profile missing' }, { status: 403 });
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [
    shipmentsTotalRes,
    inTransitRes,
    deliveredRes,
    pendingRes,
    vehiclesRes,
    recentShipmentsRes,
    recentEventsRes,
  ] = await Promise.all([
    supabaseAdmin.from('shipments').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'in_transit'),
    supabaseAdmin.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
    supabaseAdmin.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('vehicles').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('shipments')
      .select('id, reference_number, status, destination_address, updated_at')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('shipment_events')
      .select('id, event_type, created_at, notes, shipment_id')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const errors = [
    shipmentsTotalRes.error,
    inTransitRes.error,
    deliveredRes.error,
    pendingRes.error,
    vehiclesRes.error,
    recentShipmentsRes.error,
    recentEventsRes.error,
  ].filter(Boolean);

  if (errors.length) {
    return NextResponse.json({ error: errors[0]?.message || 'Unable to load overview' }, { status: 500 });
  }

  const eventRows = (recentEventsRes.data ?? []) as RecentEventRow[];
  const shipmentIds = Array.from(new Set(eventRows.map((row) => row.shipment_id).filter(Boolean)));

  const refMap = new Map<string, string>();
  if (shipmentIds.length > 0) {
    const { data: refRows } = await supabaseAdmin.from('shipments').select('id, reference_number').in('id', shipmentIds);
    for (const row of (refRows ?? []) as ShipmentRefRow[]) {
      refMap.set(row.id, row.reference_number);
    }
  }

  const recentEvents = eventRows.map((row) => ({
    id: row.id,
    event_type: row.event_type,
    created_at: row.created_at,
    notes: row.notes,
    reference_number: refMap.get(row.shipment_id) ?? row.shipment_id,
  }));

  const responseBody = {
    profile: {
      email: profile.email || user.email || '',
      display_name: profile.display_name ?? null,
      role: profile.role,
    } as ProfileSummary,
    stats: {
      shipmentsTotal: shipmentsTotalRes.count ?? 0,
      inTransit: inTransitRes.count ?? 0,
      delivered: deliveredRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      vehicleCount: vehiclesRes.count ?? 0,
    } as OverviewStats,
    recentShipments: (recentShipmentsRes.data ?? []) as RecentShipmentRow[],
    recentEvents,
  };

  return NextResponse.json(responseBody, { headers: response.headers });
}