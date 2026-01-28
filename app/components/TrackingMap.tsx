"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import SimulatedMapPreview from "@/app/components/SimulatedMapPreview";

// Type-only imports (no runtime cost)
import type {
  Map as MLMap,
  Marker as MLMarker,
  Popup as MLPopup,
  GeoJSONSource as MLGeoJSONSource,
  LngLatBounds as MLLngLatBounds,
} from "maplibre-gl";

type MapLibreModule = typeof import("maplibre-gl");

type TrackingMapProps = {
  origin: {
    lat: string | number | null;
    lng: string | number | null;
    label?: string;
  };
  destination: {
    lat: string | number | null;
    lng: string | number | null;
    label?: string;
  };
  lastEvent?: {
    lat: string | number | null;
    lng: string | number | null;
    label?: string;
  };
};

type Point = { lat: number; lng: number; label?: string };
type ResolvedPoints = {
  origin: Point | null;
  destination: Point | null;
  lastEvent: Point | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const DEFAULT_ROUTE: ResolvedPoints = {
  origin: { lat: 34.5553, lng: 69.2075, label: "Kabul Air Hub" },
  destination: { lat: 25.2048, lng: 55.2708, label: "Dubai Gateway" },
  lastEvent: {
    lat: 31.5497,
    lng: 74.3436,
    label: "In transit — Lahore checkpoint",
  },
};

const ROUTE_SOURCE_ID = "afghco-route";
const ROUTE_LAYER_ID = "afghco-route-line";

function isGeoJSONSource(src: unknown): src is MLGeoJSONSource {
  return !!src && typeof src === "object" && "setData" in src;
}

export default function TrackingMap({
  origin,
  destination,
  lastEvent,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep refs so we do NOT recreate the map on every update
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<{
    origin?: MLMarker;
    destination?: MLMarker;
    lastEvent?: MLMarker;
  }>({});

  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const points: ResolvedPoints = useMemo(() => {
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
  }, [
    origin.lat,
    origin.lng,
    origin.label,
    destination.lat,
    destination.lng,
    destination.label,
    lastEvent?.lat,
    lastEvent?.lng,
    lastEvent?.label,
  ]);

  const resolved: ResolvedPoints = useMemo(() => {
    const hasAny = points.origin || points.destination || points.lastEvent;
    return hasAny ? points : DEFAULT_ROUTE;
  }, [points]);

  // 1) Initialize the map ONCE
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled) return;

        maplibreRef.current = maplibregl;

        const initialCenter: [number, number] = (() => {
          if (resolved.lastEvent)
            return [resolved.lastEvent.lng, resolved.lastEvent.lat];
          if (resolved.origin)
            return [resolved.origin.lng, resolved.origin.lat];
          if (resolved.destination)
            return [resolved.destination.lng, resolved.destination.lat];
          return [66.0, 33.0];
        })();

        const map = new maplibregl.Map({
          container: containerRef.current as HTMLElement,
          style:
            "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          center: initialCenter,
          zoom: 4,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (!map.getSource(ROUTE_SOURCE_ID)) {
            map.addSource(ROUTE_SOURCE_ID, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: [] },
              },
            });
          }

          if (!map.getLayer(ROUTE_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: "line",
              source: ROUTE_SOURCE_ID,
              paint: {
                "line-color": "#22d3ee",
                "line-width": 4,
                "line-dasharray": [1.5, 1.5],
              },
            });
          }

          setMapReady(true);
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

      // Cleanup markers
      const ms = markersRef.current;
      Object.values(ms).forEach((m) => m?.remove());
      markersRef.current = {};

      // Cleanup map
      mapRef.current?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Update markers, route, and viewport whenever resolved points change
  useEffect(() => {
    if (!mapReady) return;

    const map = mapRef.current;
    const MapLibre = maplibreRef.current;
    if (!map || !MapLibre) return;

    const bounds: MLLngLatBounds = new MapLibre.LngLatBounds();

    const upsertMarker = (
      key: "origin" | "destination" | "lastEvent",
      pt: Point | null,
    ) => {
      if (!pt) {
        const existing = markersRef.current[key];
        existing?.remove();
        delete markersRef.current[key];
        return;
      }

      const color = key === "lastEvent" ? "#f97316" : "#2563eb";

      let marker = markersRef.current[key];
      if (!marker) {
        marker = new MapLibre.Marker({ color }).setLngLat([pt.lng, pt.lat]);

        if (pt.label) {
          const popup: MLPopup = new MapLibre.Popup({ offset: 18 }).setText(
            pt.label,
          );
          marker.setPopup(popup);
        }

        marker.addTo(map);
        markersRef.current[key] = marker;
      } else {
        marker.setLngLat([pt.lng, pt.lat]);
        if (pt.label) {
          const popup: MLPopup = new MapLibre.Popup({ offset: 18 }).setText(
            pt.label,
          );
          marker.setPopup(popup);
        }
      }

      bounds.extend([pt.lng, pt.lat]);
    };

    upsertMarker("origin", resolved.origin);
    upsertMarker("destination", resolved.destination);
    upsertMarker("lastEvent", resolved.lastEvent);

    const coords = [resolved.origin, resolved.lastEvent, resolved.destination]
      .filter((pt): pt is Point => pt !== null)
      .map((pt) => [pt.lng, pt.lat]);

    const srcUnknown = map.getSource(ROUTE_SOURCE_ID) as unknown;
    if (isGeoJSONSource(srcUnknown)) {
      srcUnknown.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords.length >= 2 ? coords : [],
        },
      });
    }

    // Recenter to latest event if available; else fit bounds
    if (resolved.lastEvent) {
      map.flyTo({
        center: [resolved.lastEvent.lng, resolved.lastEvent.lat],
        zoom: 6,
        essential: true,
      });
    } else if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 8 });
    }
  }, [mapReady, resolved]);

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
      <div
        ref={containerRef}
        className="mt-3 h-72 sm:h-105 rounded-lg overflow-hidden"
      />
    </div>
  );
}
