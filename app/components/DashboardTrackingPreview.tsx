'use client';

import { useEffect, useMemo, useState } from 'react';
import TrackingMap from '@/app/components/TrackingMap';
import SimulatedMapPreview from '@/app/components/SimulatedMapPreview';
import TrackingProgressBox from '@/app/components/TrackingProgressBox';
import { apiFetch } from '@/lib/client/api';

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
  current_location_label?: string | null;
  current_lat?: string | number | null;
  current_lng?: string | number | null;
  last_event_type: string | null;
  last_event_at: string | null;
  last_event_notes: string | null;
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

export default function DashboardTrackingPreview() {
  const [reference, setReference] = useState('');
  const trimmed = reference.trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<TrackShipmentRow | null>(null);
  const [events, setEvents] = useState<TrackShipmentEvent[]>([]);

  const hasRef = !!trimmed;

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!hasRef) {
        setRow(null);
        setEvents([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch(`/api/track?ref=${encodeURIComponent(trimmed)}`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });

        const json = (await res.json()) as {
          data: TrackShipmentRow | null;
          events?: TrackShipmentEvent[];
          error: string | null;
        };

        if (!active) return;

        if (!res.ok) {
          setRow(null);
          setEvents([]);
          setError(json.error || 'Tracking lookup failed');
          return;
        }

        setRow(json.data);
        setEvents(json.events ?? []);
        setError(null);
      } catch (e: unknown) {
        if (!active) return;
        setRow(null);
        setEvents([]);
        setError(e instanceof Error ? e.message : 'Tracking lookup failed');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [hasRef, trimmed]);

  const statusLine = useMemo(() => {
    if (!hasRef) return 'Enter a reference number to preview tracking.';
    if (loading) return `Looking up ${trimmed}…`;
    if (error) return error;
    if (!row) return `No shipment found for ${trimmed}.`;
    return `Status: ${row.status}`;
  }, [error, hasRef, loading, row, trimmed]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-black">Tracking preview</div>
          <p className="mt-1 text-slate-400 text-sm">{statusLine}</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference #"
            className="flex-1 sm:flex-none sm:w-72 px-4 py-3 rounded bg-slate-950 border border-slate-800 text-slate-100"
            inputMode="text"
          />
          <button
            type="button"
            className="px-4 py-3 rounded bg-blue-600 hover:bg-blue-700 transition font-semibold"
            onClick={() => setReference((v) => v.trim())}
            disabled={!reference.trim()}
          >
            Track
          </button>
        </div>
      </div>

      {row ? (
        <div className="mt-4 grid gap-4">
          <TrackingMap
            origin={{ lat: row.origin_lat ?? null, lng: row.origin_lng ?? null, label: row.origin_address }}
            destination={{ lat: row.dest_lat ?? null, lng: row.dest_lng ?? null, label: row.destination_address }}
            events={events.map((event) => ({
              lat: event.latitude,
              lng: event.longitude,
              type: event.event_type ?? undefined,
              at: event.created_at ?? undefined,
              notes: event.notes ?? undefined,
            }))}
            status={row.status}
            lastUpdateAt={row.last_event_at ?? null}
            lastNotes={row.last_event_notes ?? null}
            lastEvent={{
              lat: row.last_event_lat ?? row.current_lat ?? null,
              lng: row.last_event_lng ?? row.current_lng ?? null,
              label: row.last_event_type ? `Last update: ${row.last_event_type}` : undefined,
            }}
          />
          <TrackingProgressBox data={row} />
        </div>
      ) : (
        <SimulatedMapPreview
          subtitle={hasRef ? 'Waiting for tracking data…' : 'Simulated map view (mobile-first)'}
        />
      )}
    </div>
  );
}

