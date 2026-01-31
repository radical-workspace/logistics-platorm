import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type TrackRow = {
  shipment_id?: string | null;
  current_location_label?: string | null;
  current_lat?: number | string | null;
  current_lng?: number | string | null;
  last_event_type?: string | null;
  last_event_at?: string | null;
  last_event_lat?: number | string | null;
  last_event_lng?: number | string | null;
};

const asNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const ref = (reference || "").trim();

  if (!ref) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }
  if (ref.length > 80) {
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("track_shipment", {
    p_reference_number: ref,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] ?? null : data ?? null) as
    | TrackRow
    | null;

  if (!row?.shipment_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lat = asNumber(row.last_event_lat ?? row.current_lat);
  const lng = asNumber(row.last_event_lng ?? row.current_lng);

  const label = (() => {
    const type = row.last_event_type || "";
    const location = row.current_location_label || "";
    if (type && location) return `${type} - ${location}`;
    return type || location || "Current location";
  })();

  return NextResponse.json({
    lat,
    lng,
    label,
    updated_at: row.last_event_at ?? null,
  });
}
