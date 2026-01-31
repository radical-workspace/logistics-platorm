import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/server/supabase-route";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { lat?: unknown; lng?: unknown; reason?: unknown }
    | null;

  const latRaw = body?.lat;
  const lngRaw = body?.lng;
  const reason = String(body?.reason ?? "").trim().slice(0, 280) || null;

  const latitude =
    latRaw === "" || latRaw == null ? null : Number(String(latRaw));
  const longitude =
    lngRaw === "" || lngRaw == null ? null : Number(String(lngRaw));

  if (latitude === null || longitude === null) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const { supabase, response } = await createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: response.headers });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: response.headers });
  }

  const now = new Date().toISOString();

  const { data: shipment, error: shipmentErr } = await supabaseAdmin
    .from("shipments")
    .update({ current_lat: latitude, current_lng: longitude, last_event_at: now })
    .eq("id", id)
    .select("id")
    .single();

  if (shipmentErr || !shipment) {
    return NextResponse.json({ error: shipmentErr?.message || "Shipment not found" }, { status: 404, headers: response.headers });
  }

  const { data: event, error: eventErr } = await supabaseAdmin
    .from("shipment_events")
    .insert({
      shipment_id: id,
      event_type: "location_correction",
      latitude,
      longitude,
      notes: reason,
      created_by: user.id,
    })
    .select("id,shipment_id,event_type,latitude,longitude,notes,created_by,created_at")
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ error: eventErr?.message || "Failed to create event" }, { status: 500, headers: response.headers });
  }

  return NextResponse.json({ ok: true, event }, { status: 200, headers: response.headers });
}
