'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TrackingMap from '@/app/components/TrackingMap';
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
  last_event_type: string | null;
  last_event_at: string | null;
  last_event_lat: string | number | null;
  last_event_lng: string | number | null;
};

export default function HomeTrackingPreview() {
  const searchParams = useSearchParams();
  const ref = (searchParams.get('ref') || '').trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<TrackShipmentRow | null>(null);

  const hasRef = !!ref;

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!hasRef) {
        setRow(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch(`/api/track?ref=${encodeURIComponent(ref)}`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });

        const json = (await res.json()) as { data: TrackShipmentRow | null; error: string | null };

        if (!active) return;

        if (!res.ok) {
          setRow(null);
          setError(json.error || 'Tracking lookup failed');
          return;
        }

        setRow(json.data);
        setError(null);
      } catch (e: unknown) {
        if (!active) return;
        setRow(null);
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
  }, [hasRef, ref]);

  const statusLine = useMemo(() => {
    if (!hasRef) return 'Enter a reference number above to preview tracking.';
    if (loading) return `Looking up ${ref}…`;
    if (error) return error;
    if (!row) return `No shipment found for ${ref}.`;
    return `Status: ${row.status}`;
  }, [error, hasRef, loading, ref, row]);

  return (
    <div>
      <p className="text-slate-300">{statusLine}</p>

      <TrackingMap
        origin={{
          lat: row?.origin_lat ?? null,
          lng: row?.origin_lng ?? null,
          label: row?.origin_address,
        }}
        destination={{
          lat: row?.dest_lat ?? null,
          lng: row?.dest_lng ?? null,
          label: row?.destination_address,
        }}
        lastEvent={{
          lat: row?.last_event_lat ?? null,
          lng: row?.last_event_lng ?? null,
          label: row?.last_event_type ? `Last update: ${row.last_event_type}` : undefined,
        }}
      />
    </div>
  );
}

