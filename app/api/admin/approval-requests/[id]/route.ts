import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/server/supabase-route";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth (must be logged in)
  const { supabase } = createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminId = user.id;

  // Admin check (must be admin role in profiles)
  const { data: adminProfile, error: adminProfileErr } = await supabaseAdmin
    .from("profiles")
    .select("id,role")
    .eq("id", adminId)
    .maybeSingle();

  if (adminProfileErr) {
    return NextResponse.json(
      { ok: false, error: adminProfileErr.message },
      { status: 500 },
    );
  }

  if ((adminProfile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  // Parse body
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    reviewer_notes?: unknown;
  } | null;

  const action = String(body?.action ?? "")
    .trim()
    .toLowerCase();
  const reviewerNotes = String(body?.reviewer_notes ?? "")
    .trim()
    .slice(0, 800);

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 },
    );
  }

  // Load request
  const { data: reqRow, error: reqErr } = await supabaseAdmin
    .from("approval_requests")
    .select("id,request_type,shipment_id,status,requested_payload,requested_by")
    .eq("id", id)
    .single();

  if (reqErr || !reqRow) {
    return NextResponse.json(
      { ok: false, error: reqErr?.message || "Request not found" },
      { status: 404 },
    );
  }

  if (reqRow.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "Request already processed" },
      { status: 400 },
    );
  }

  // Update request status first
  const newStatus = action === "approve" ? "approved" : "rejected";
  const { error: updReqErr } = await supabaseAdmin
    .from("approval_requests")
    .update({
      status: newStatus,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewerNotes || null,
    })
    .eq("id", id);

  if (updReqErr) {
    return NextResponse.json(
      { ok: false, error: updReqErr.message },
      { status: 500 },
    );
  }

  // If approved and it's delivery confirmation, admin sets shipment to delivered
  if (action === "approve" && reqRow.request_type === "delivery_confirmation") {
    console.log(
      "APPROVAL: setting shipment status to",
      "delivered",
      "for shipment",
      reqRow.shipment_id,
    );
    const { error: updShipErr } = await supabaseAdmin
      .from("shipments")
      .update({ status: "delivered" }) // IMPORTANT: lowercase enum value
      .eq("id", reqRow.shipment_id);

    if (updShipErr) {
      return NextResponse.json(
        { ok: false, error: updShipErr.message },
        { status: 500 },
      );
    }

    // Best-effort event log
    try {
      await supabaseAdmin.from("shipment_events").insert({
        shipment_id: reqRow.shipment_id,
        event_type: "status_update",
        notes: "Delivered (approved by admin after customer confirmation)",
        created_by: adminId,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
