"use client";
import { useEffect, useMemo, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MapLibreMap,
  type Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type LatLngLike = string | number | null | undefined;

type PointInput = {
  lat: LatLngLike;
  lng: LatLngLike;
  label?: string | null;
};

export default function TrackingMap({
  origin,
  destination,
  lastEvent,
  events,
}: {
  origin?: PointInput;
  destination?: PointInput;
  lastEvent?: PointInput;
  events?: Array<{
    lat: number | string | null;
    lng: number | string | null;
    type?: string;
    at?: string;
    notes?: string;
  }>;
  status?: string;
  lastUpdateAt?: string | null;
  lastNotes?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const markersRef = useRef<{
    origin?: MapLibreMarker;
    destination?: MapLibreMarker;
    current?: MapLibreMarker;
  }>({});
  const pulseRef = useRef<MapLibreMarker | null>(null);

  const asNumber = (v: LatLngLike): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const normalized = useMemo(() => {
    const oLat = asNumber(origin?.lat);
    const oLng = asNumber(origin?.lng);
    const dLat = asNumber(destination?.lat);
    const dLng = asNumber(destination?.lng);
    const eLat = asNumber(lastEvent?.lat);
    const eLng = asNumber(lastEvent?.lng);

    const o = oLat !== null && oLng !== null ? ([oLng, oLat] as const) : null;
    const d = dLat !== null && dLng !== null ? ([dLng, dLat] as const) : null;
    const e = eLat !== null && eLng !== null ? ([eLng, eLat] as const) : null;

    return { o, d, e };
  }, [
    origin?.lat,
    origin?.lng,
    destination?.lat,
    destination?.lng,
    lastEvent?.lat,
    lastEvent?.lng,
  ]);

  const eventCoords = useMemo(() => {
    return (events ?? [])
      .map((event) => {
        const lat = asNumber(event.lat);
        const lng = asNumber(event.lng);
        if (lat === null || lng === null) return null;
        return [lng, lat] as [number, number];
      })
      .filter((coord): coord is [number, number] => coord !== null);
  }, [events]);

  const lastEventCoord = useMemo(() => {
    if (eventCoords.length > 0) return eventCoords[eventCoords.length - 1];
    return normalized.e;
  }, [eventCoords, normalized.e]);

  const routeGeoJson = useMemo(() => {
    const routeCoords: Array<[number, number]> = [];

    if (normalized.o) routeCoords.push([normalized.o[0], normalized.o[1]]);
    eventCoords.forEach((coord) => routeCoords.push(coord));
    if (normalized.d) routeCoords.push([normalized.d[0], normalized.d[1]]);

    if (routeCoords.length < 2) {
      return {
        type: "FeatureCollection",
        features: [],
      } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoords.map(([lng, lat]) => [
              Number(lng),
              Number(lat),
            ]),
          },
        },
      ],
    } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
  }, [normalized.o, normalized.d, eventCoords]);

  const bounds = useMemo(() => {
    const pts = [normalized.o, ...eventCoords, normalized.d].filter(
      Boolean,
    ) as Array<[number, number]>;
    if (pts.length === 0) return null;

    let minLng = pts[0][0];
    let maxLng = pts[0][0];
    let minLat = pts[0][1];
    let maxLat = pts[0][1];

    for (const [lng, lat] of pts) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    // Add a bit of padding by expanding bounds slightly
    const padLng = Math.max(0.01, (maxLng - minLng) * 0.15);
    const padLat = Math.max(0.01, (maxLat - minLat) * 0.15);

    const b: LngLatBoundsLike = [
      [minLng - padLng, minLat - padLat],
      [maxLng + padLng, maxLat + padLat],
    ];
    return b;
  }, [normalized.o, normalized.d, eventCoords, normalized.e]);

  // Create map ONCE
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 0],
      zoom: 2,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );

    map.on("load", () => {
      // Route source + layer
      map.addSource("route", {
        type: "geojson",
        data: routeGeoJson,
      });

      map.addSource("checkpoints", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-width": 4,
          "line-opacity": 0.9,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      // Make it dashed (enterprise-looking “in transit” feel)
      map.setPaintProperty("route-line", "line-dasharray", [2, 2]);

      map.addLayer({
        id: "checkpoint-circles",
        type: "circle",
        source: "checkpoints",
        paint: {
          "circle-color": "#22d3ee",
          "circle-radius": 4,
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });

      // Fit to bounds when we have them
      if (bounds) {
        map.fitBounds(bounds, { padding: 40, duration: 0 });
      }
    });

    mapRef.current = map;

    return () => {
      if (pulseRef.current) {
        pulseRef.current.remove();
        pulseRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route + markers whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Update route geojson
    const src = map.getSource("route") as GeoJSONSource | undefined;
    if (src) src.setData(routeGeoJson);

    const checkpointSrc = map.getSource("checkpoints") as GeoJSONSource | undefined;
    if (checkpointSrc) {
      checkpointSrc.setData({
        type: "FeatureCollection",
        features: eventCoords.map((coord) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: coord },
        })),
      });
    }

    // Markers helpers
    const upsertMarker = (
      key: "origin" | "destination" | "current",
      coord: [number, number] | null,
      label: string,
      cssClass: string,
    ) => {
      const existing = markersRef.current[key];

      if (!coord) {
        if (existing) {
          existing.remove();
          delete markersRef.current[key];
        }
        return;
      }

      const el = document.createElement("div");
      el.className = cssClass;
      el.title = label;

      // Basic “enterprise” marker look
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 6px 18px rgba(0,0,0,.35)";

      if (cssClass === "marker-origin") el.style.background = "#22c55e"; // green
      if (cssClass === "marker-destination") el.style.background = "#3b82f6"; // blue
      if (cssClass === "marker-current") el.style.background = "#f59e0b"; // amber

      if (existing) {
        existing.setLngLat(coord);
        return;
      }

      const m = new maplibregl.Marker({ element: el })
        .setLngLat(coord)
        .addTo(map);
      markersRef.current[key] = m;
    };

    upsertMarker(
      "origin",
      normalized.o,
      origin?.label || "Origin",
      "marker-origin",
    );
    upsertMarker(
      "destination",
      normalized.d,
      destination?.label || "Destination",
      "marker-destination",
    );
    upsertMarker(
      "current",
      lastEventCoord,
      lastEvent?.label || "Current location",
      "marker-current",
    );

    if (lastEventCoord) {
      if (!pulseRef.current) {
        const el = document.createElement("div");
        el.className = "tracking-pulse-marker";
        pulseRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(lastEventCoord)
          .addTo(map);
      } else {
        pulseRef.current.setLngLat(lastEventCoord);
      }
    } else if (pulseRef.current) {
      pulseRef.current.remove();
      pulseRef.current = null;
    }

    // Fit bounds smoothly if we have them
    if (bounds) {
      map.fitBounds(bounds, { padding: 50, duration: 600 });
    } else if (lastEventCoord) {
      map.easeTo({ center: lastEventCoord, zoom: 10, duration: 600 });
    }
  }, [
    routeGeoJson,
    bounds,
    normalized.o,
    normalized.d,
    lastEventCoord,
    origin?.label,
    destination?.label,
    lastEvent?.label,
    eventCoords,
  ]);

  return (
    <div className="mt-6">
      <div className="text-slate-400 text-sm mb-2">Map</div>
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div ref={containerRef} style={{ width: "100%", height: 320 }} />
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Green = Origin • Amber = Current location • Blue = Destination
      </div>
      <style jsx global>{`
        .tracking-pulse-marker {
          position: relative;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #f59e0b;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.8);
        }
        .tracking-pulse-marker::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34px;
          height: 34px;
          margin-left: -17px;
          margin-top: -17px;
          border-radius: 9999px;
          background: rgba(245, 158, 11, 0.35);
          animation: trackingPulse 2.2s ease-out infinite;
        }
        @keyframes trackingPulse {
          0% {
            transform: scale(0.35);
            opacity: 0.8;
          }
          70% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
