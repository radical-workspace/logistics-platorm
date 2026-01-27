import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/server/supabase-route";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { supabase } = createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { notes?: unknown; delivered_at?: unknown }
    | null;

  const notes = String(body?.notes ?? "").trim().slice(0, 500);
  const deliveredAt = String(body?.delivered_at ?? "").trim(); // optional ISO string

  // Verify shipment belongs to this customer (RLS enforces ownership)
  const { data: shipment, error: shipErr } = await supabase
    .from("shipments")
    .select("id, customer_id, status")
    .eq("id", id)
    .single();

  if (shipErr || !shipment) {
    return NextResponse.json({ ok: false, error: shipErr?.message || "Shipment not found" }, { status: 404 });
  }

  if (String(shipment.status).toLowerCase() === "delivered") {
    return NextResponse.json({ ok: false, error: "Shipment already delivered" }, { status: 400 });
  }

  // Insert request (RLS also enforces ownership)
  const { data: created, error: reqErr } = await supabase
    .from("approval_requests")
    .insert({
      request_type: "delivery_confirmation",
      shipment_id: id,
      requested_by: user.id,
      requested_payload: {
        notes: notes || null,
        delivered_at: deliveredAt || null,
      },
      status: "pending",
    })
    .select("id,status,created_at")
    .single();

  if (reqErr || !created) {
    // Make this endpoint idempotent: if there's already a pending request for this shipment/type,
    // return it instead of failing on unique constraints.
    if (reqErr?.code === "23505" || /duplicate key/i.test(reqErr?.message || "")) {
      const { data: existing, error: existingErr } = await supabase
        .from("approval_requests")
        .select("id,status,created_at")
        .eq("shipment_id", id)
        .eq("request_type", "delivery_confirmation")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingErr) {
        return NextResponse.json({ ok: false, error: existingErr.message }, { status: 400 });
      }
      if (existing?.id) {
        return NextResponse.json({ ok: true, request: existing }, { status: 200 });
      }
    }

    return NextResponse.json({ ok: false, error: reqErr?.message || "Request failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, request: created }, { status: 200 });
}
