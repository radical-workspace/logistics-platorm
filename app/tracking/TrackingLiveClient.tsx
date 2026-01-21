'use client';

import { useEffect, useMemo, useState } from 'react';
import TrackingMap from '@/app/components/TrackingMap';
import { createApiEventSource } from '@/lib/api';

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
    if (!row.last_event_type) return 'Last update';
    return `Last update: ${row.last_event_type}`;
  }, [row.last_event_type]);

  useEffect(() => {
    const url = `/api/track/stream?ref=${encodeURIComponent(reference)}`;
    const source = createApiEventSource(url);

    const onSnapshot = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { row: TrackShipmentRow };
        if (payload?.row) setRow(payload.row);
      } catch {
        // ignore
      }
    };

    const onError = () => {
      setStreamError('Realtime stream disconnected; showing last known position.');
      source.close();
    };

    source.addEventListener('snapshot', onSnapshot as EventListener);
    source.addEventListener('error', onError);

    return () => {
      source.close();
    };
  }, [reference]);

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
            <div className="text-slate-200">{row.estimated_delivery ?? '—'}</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm">Actual delivery</div>
            <div className="text-slate-200">{row.actual_delivery ?? '—'}</div>
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-sm">Last update</div>
          <div className="text-slate-200">
            {row.last_event_type ? row.last_event_type : '—'}
            {row.last_event_at ? <span className="text-slate-500"> {' '}({row.last_event_at})</span> : null}
          </div>
          {row.last_event_notes ? <div className="mt-1 text-slate-400 text-sm">{row.last_event_notes}</div> : null}
        </div>

        <TrackingMap
          origin={{ lat: row.origin_lat, lng: row.origin_lng, label: row.origin_address }}
          destination={{ lat: row.dest_lat, lng: row.dest_lng, label: row.destination_address }}
          lastEvent={{ lat: row.last_event_lat, lng: row.last_event_lng, label: lastUpdateLabel }}
        />
      </div>
    </div>
  );
}
