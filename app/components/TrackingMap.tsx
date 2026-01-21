'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import SimulatedMapPreview from '@/app/components/SimulatedMapPreview';

type TrackingMapProps = {
  origin: { lat: string | number | null; lng: string | number | null; label?: string };
  destination: { lat: string | number | null; lng: string | number | null; label?: string };
  lastEvent?: { lat: string | number | null; lng: string | number | null; label?: string };
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const DEFAULT_ROUTE = {
  origin: { lat: 34.5553, lng: 69.2075, label: 'Kabul Air Hub' },
  destination: { lat: 25.2048, lng: 55.2708, label: 'Dubai Gateway' },
  lastEvent: { lat: 31.5497, lng: 74.3436, label: 'In transit — Lahore checkpoint' },
};

export default function TrackingMap({ origin, destination, lastEvent }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const [mapFailed, setMapFailed] = useState(false);

  const points = useMemo(() => {
    const originLat = toNumber(origin.lat);
    const originLng = toNumber(origin.lng);
    const destLat = toNumber(destination.lat);
    const destLng = toNumber(destination.lng);
    const lastLat = toNumber(lastEvent?.lat);
    const lastLng = toNumber(lastEvent?.lng);

    return {
      origin:
        originLat !== null && originLng !== null
          ? { lat: originLat, lng: originLng, label: origin.label }
          : null,
      destination:
        destLat !== null && destLng !== null
          ? { lat: destLat, lng: destLng, label: destination.label }
          : null,
      lastEvent:
        lastLat !== null && lastLng !== null
          ? { lat: lastLat, lng: lastLng, label: lastEvent?.label }
          : null,
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng, lastEvent?.lat, lastEvent?.lng]);

  const resolved = useMemo(() => {
    const hasAny = points.origin || points.destination || points.lastEvent;
    if (hasAny) return points;
    return DEFAULT_ROUTE;
  }, [points]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        const maplibregl = await import('maplibre-gl');

        if (cancelled) return;

        const center = (() => {
        if (resolved.lastEvent) return [resolved.lastEvent.lng, resolved.lastEvent.lat] as [number, number];
        if (resolved.origin) return [resolved.origin.lng, resolved.origin.lat] as [number, number];
        if (resolved.destination) return [resolved.destination.lng, resolved.destination.lat] as [number, number];
        return [66.0, 33.0] as [number, number];
      })();

        const map = new maplibregl.default.Map({
        container: containerRef.current as HTMLElement,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center,
        zoom: 4,
      });

        mapRef.current = map;

        map.on('load', () => {
          const bounds = new maplibregl.default.LngLatBounds();

          const addMarker = (lng: number, lat: number, label?: string) => {
            const marker = new maplibregl.default.Marker({ color: '#2563eb' }).setLngLat([lng, lat]);
            if (label) {
              marker.setPopup(new maplibregl.default.Popup({ offset: 18 }).setText(label));
            }
            marker.addTo(map);
            bounds.extend([lng, lat]);
          };

          if (resolved.origin) addMarker(resolved.origin.lng, resolved.origin.lat, resolved.origin.label);
          if (resolved.destination) addMarker(resolved.destination.lng, resolved.destination.lat, resolved.destination.label);
          if (resolved.lastEvent) addMarker(resolved.lastEvent.lng, resolved.lastEvent.lat, resolved.lastEvent.label);

          const routePoints = [resolved.origin, resolved.lastEvent, resolved.destination]
            .filter((pt) => pt !== null)
            .map((pt) => [pt.lng, pt.lat]);

          if (routePoints.length >= 2) {
            map.addSource('afghco-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routePoints,
                },
              },
            });

            map.addLayer({
              id: 'afghco-route-line',
              type: 'line',
              source: 'afghco-route',
              paint: {
                'line-color': '#22d3ee',
                'line-width': 4,
                'line-dasharray': [1.5, 1.5],
              },
            });
          }

          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 80, maxZoom: 8 });
          }
        });

        setMapFailed(false);
      } catch {
        if (cancelled) return;
        setMapFailed(true);
      }
    };

    void init();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      if (map?.remove) map.remove();
      mapRef.current = null;
    };
  }, [resolved, origin.label, destination.label, lastEvent?.label]);

  if (mapFailed) {
    return (
      <SimulatedMapPreview
        title="Map preview"
        subtitle="Interactive map temporarily unavailable."
      />
    );
  }

  return (
    <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-slate-300 font-semibold">Map</div>
      <div ref={containerRef} className="mt-3 h-72 sm:h-105 rounded-lg overflow-hidden" />
    </div>
  );
}
