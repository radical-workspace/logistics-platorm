import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";

type TrackShipmentRow = {
  shipment_id: string;
  reference_number: string;
  status: string;
  origin_address: string;
  origin_lat: string | number | null;
  origin_lng: string | number | null;
  destination_address: string;
  dest_lat: string | number | null;
  dest_lng: string | number | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  last_event_type: string | null;
  last_event_notes: string | null;
  last_event_at: string | null;
  last_event_lat: string | number | null;
  last_event_lng: string | number | null;
};

type TrackShipmentEvent = {
  event_type: string | null;
  notes: string | null;
  created_at: string;
  latitude: string | number | null;
  longitude: string | number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = (searchParams.get("ref") || "").trim();

  if (!ref) {
    return NextResponse.json(
      { data: null, events: [], error: "Missing ref" },
      { status: 400 },
    );
  }
  if (ref.length > 80) {
    return NextResponse.json(
      { data: null, events: [], error: "Invalid ref" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* no-op */
        },
      },
    },
  );

  const { data, error } = await supabase.rpc("track_shipment", {
    p_reference_number: ref,
  });

  if (error) {
    return NextResponse.json(
      { data: null, events: [], error: error.message },
      { status: 500 },
    );
  }

  const row = (Array.isArray(data) ? data[0] ?? null : data ?? null) as
    | TrackShipmentRow
    | null;

  if (!row?.shipment_id) {
    return NextResponse.json({ data: null, events: [], error: null });
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("shipment_events")
    .select("event_type, notes, created_at, latitude, longitude")
    .eq("shipment_id", row.shipment_id)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsError) {
    return NextResponse.json({ data: row, events: [], error: null });
  }

  const events: TrackShipmentEvent[] = Array.isArray(eventsData)
    ? [...eventsData].reverse()
    : [];

  return NextResponse.json({ data: row, events, error: null });
}
