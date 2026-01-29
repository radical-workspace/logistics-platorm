"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TrackingMap from "@/app/components/TrackingMap";
import { supabaseBrowser } from "@/lib/client/supabase";

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

export default function TrackingLiveClient({
  initialRow,
  reference,
}: {
  initialRow: TrackShipmentRow;
  reference: string;
}) {
  const [row, setRow] = useState<TrackShipmentRow>(initialRow);
  const [streamError, setStreamError] = useState<string | null>(null);

  const lastUpdateLabel = useMemo(() => {
    if (!row.last_event_type) return "Current location";
    return `Current: ${row.last_event_type}`;
  }, [row.last_event_type]);

  const fetchSnapshot = useCallback(async (ref: string) => {
    const res = await fetch(
      `/api/track/snapshot?ref=${encodeURIComponent(ref)}`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as {
      row?: TrackShipmentRow;
      error?: string;
    };
    if (!res.ok) throw new Error(json?.error || "Snapshot failed");
    if (!json.row) throw new Error("Snapshot missing");
    return json.row;
  }, []);

  useEffect(() => {
    let channel: ReturnType<(typeof supabaseBrowser)["channel"]> | null = null;
    let cancelled = false;

    (async () => {
      try {
        setStreamError(null);

        const first = await fetchSnapshot(reference);
        if (cancelled) return;
        setRow(first);

        channel = supabaseBrowser
          .channel(`tracking:${first.shipment_id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "shipment_events",
              filter: `shipment_id=eq.${first.shipment_id}`,
            },
            async () => {
              try {
                const next = await fetchSnapshot(reference);
                if (!cancelled) setRow(next);
              } catch (e: unknown) {
                const message =
                  e instanceof Error ? e.message : "Live update failed";
                if (!cancelled) setStreamError(message);
              }
            },
          )
          .subscribe((status) => {
            if (cancelled) return;
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setStreamError(
                "Realtime disconnected; showing last known position.",
              );
            }
          });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Live tracking failed";
        if (!cancelled) setStreamError(message);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabaseBrowser.removeChannel(channel);
    };
  }, [reference, fetchSnapshot]);

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-slate-400 text-sm">Reference</div>
          <div className="text-xl font-bold">{row.reference_number}</div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-sm">Status</div>
          <div className="text-lg font-semibold">{row.status}</div>
        </div>
      </div>

      {streamError ? (
        <div className="mt-4 rounded-lg border border-amber-700 bg-amber-900/20 p-3 text-amber-200 text-sm">
          {streamError}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        <div>
          <div className="text-slate-400 text-sm">Origin</div>
          <div className="text-slate-200">{row.origin_address}</div>
        </div>
        <div>
          <div className="text-slate-400 text-sm">Destination</div>
          <div className="text-slate-200">{row.destination_address}</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-400 text-sm">Estimated delivery</div>
            <div className="text-slate-200">
              {row.estimated_delivery ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm">Actual delivery</div>
            <div className="text-slate-200">{row.actual_delivery ?? "—"}</div>
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-sm">Last update</div>
          <div className="text-slate-200">
            {row.last_event_type ? row.last_event_type : "—"}
            {row.last_event_at ? (
              <span className="text-slate-500"> ({row.last_event_at})</span>
            ) : null}
          </div>
          {row.last_event_notes ? (
            <div className="mt-1 text-slate-400 text-sm">
              {row.last_event_notes}
            </div>
          ) : null}
        </div>

        <TrackingMap
          origin={{
            lat: row.origin_lat,
            lng: row.origin_lng,
            label: row.origin_address,
          }}
          destination={{
            lat: row.dest_lat,
            lng: row.dest_lng,
            label: row.destination_address,
          }}
          lastEvent={{
            lat: row.last_event_lat,
            lng: row.last_event_lng,
            label: lastUpdateLabel,
          }}
        />
      </div>
    </div>
  );
}
