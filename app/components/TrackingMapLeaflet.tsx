"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import type { TrackingMapProps, LatLngLike } from "./TrackingMap.types";
import "leaflet/dist/leaflet.css";

const asNumber = (v: LatLngLike): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && !v.trim()) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });

const labelFor = (label: string | null | undefined, fallback: string) => {
  const trimmed = (label || "").trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 39)}...`;
};

const createDotIcon = (className: string) =>
  L.divIcon({
    className: "",
    html: `<div class="leaflet-marker-dot ${className}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const createLabelIcon = (label: string, className: string) =>
  L.divIcon({
    className: "",
    html: `<div class="leaflet-route-label ${className}">${escapeHtml(
      label,
    )}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

export default function TrackingMap({
  origin,
  destination,
  lastEvent,
  events,
}: TrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastFitRef = useRef<string | null>(null);
  const lastCenterRef = useRef<string | null>(null);

  // ✅ Tile provider (production-safe) — set NEXT_PUBLIC_MAPTILER_KEY
  const TILE_URL = `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || ""}`;

  const normalized = useMemo(() => {
    const oLat = asNumber(origin?.lat);
    const oLng = asNumber(origin?.lng);
    const dLat = asNumber(destination?.lat);
    const dLng = asNumber(destination?.lng);
    const eLat = asNumber(lastEvent?.lat);
    const eLng = asNumber(lastEvent?.lng);

    const o = oLat !== null && oLng !== null ? ([oLat, oLng] as const) : null;
    const d = dLat !== null && dLng !== null ? ([dLat, dLng] as const) : null;
    const e = eLat !== null && eLng !== null ? ([eLat, eLng] as const) : null;

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
        return [lat, lng] as [number, number];
      })
      .filter((coord): coord is [number, number] => coord !== null);
  }, [events]);

  const lastEventCoord = useMemo(() => {
    if (eventCoords.length > 0) return eventCoords[eventCoords.length - 1];
    return normalized.e
      ? ([normalized.e[0], normalized.e[1]] as [number, number])
      : null;
  }, [eventCoords, normalized.e]);

  const routeCoords = useMemo(() => {
    const coords: Array<[number, number]> = [];
    const pushCoord = (coord: [number, number] | null) => {
      if (!coord) return;
      const last = coords[coords.length - 1];
      if (!last || last[0] !== coord[0] || last[1] !== coord[1]) {
        coords.push(coord);
      }
    };

    pushCoord(normalized.o);
    eventCoords.forEach((coord) => pushCoord(coord));
    pushCoord(lastEventCoord);
    pushCoord(normalized.d);

    return coords;
  }, [normalized.o, normalized.d, eventCoords, lastEventCoord]);

  const boundsKey = useMemo(() => {
    if (routeCoords.length === 0) return null;
    return routeCoords
      .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
      .join("|");
  }, [routeCoords]);

  const lastEventKey = useMemo(() => {
    if (!lastEventCoord) return null;
    return `${lastEventCoord[0].toFixed(4)},${lastEventCoord[1].toFixed(4)}`;
  }, [lastEventCoord]);

  const originIcon = useMemo(() => createDotIcon("marker-origin"), []);
  const destinationIcon = useMemo(
    () => createDotIcon("marker-destination"),
    [],
  );
  const currentIcon = useMemo(() => createDotIcon("marker-current"), []);

  const originLabelIcon = useMemo(
    () => createLabelIcon(labelFor(origin?.label, "Origin"), "label-origin"),
    [origin?.label],
  );
  const destinationLabelIcon = useMemo(
    () =>
      createLabelIcon(
        labelFor(destination?.label, "Destination"),
        "label-destination",
      ),
    [destination?.label],
  );
  const currentLabelIcon = useMemo(
    () =>
      createLabelIcon(labelFor(lastEvent?.label, "Current"), "label-current"),
    [lastEvent?.label],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (routeCoords.length > 0 && boundsKey) {
      if (boundsKey !== lastFitRef.current) {
        lastFitRef.current = boundsKey;
        lastCenterRef.current = null;
        const bounds = L.latLngBounds(routeCoords);
        map.fitBounds(bounds, { padding: [40, 40], animate: true });
      }
    } else if (lastEventCoord && lastEventKey) {
      if (lastEventKey !== lastCenterRef.current) {
        lastCenterRef.current = lastEventKey;
        map.setView(lastEventCoord, 6, { animate: true });
      }
    }
  }, [mapReady, routeCoords, boundsKey, lastEventCoord, lastEventKey]);

  const missingTileKey = TILE_URL.includes("key=") && TILE_URL.endsWith("key=");

  return (
    <div className="mt-6">
      <div className="text-slate-400 text-sm mb-2">Map</div>

      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div className="relative">
          <div className="w-full h-80">
            <MapContainer
              center={[0, 0]}
              zoom={4}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
              // ✅ Reliable way to capture the map instance
              whenCreated={(map) => {
                mapRef.current = map;
                setMapReady(true);
              }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url={TILE_URL}
                updateWhenIdle
                keepBuffer={2}
              />

              {routeCoords.length >= 2 ? (
                <>
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{
                      className: "route-glow",
                      color: "#60a5fa",
                      weight: 10,
                      opacity: 0.35,
                    }}
                  />
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{
                      className: "route-line",
                      color: "#0f172a",
                      weight: 5,
                      opacity: 0.95,
                      dashArray: "8 8",
                    }}
                  />
                </>
              ) : null}

              {eventCoords.map((coord, idx) => (
                <CircleMarker
                  key={`checkpoint-${idx}`}
                  center={coord}
                  radius={4.5}
                  pathOptions={{
                    color: "#0f172a",
                    weight: 1.5,
                    fillColor: "#0ea5e9",
                    fillOpacity: 0.9,
                  }}
                  className="checkpoint-marker"
                />
              ))}

              {normalized.o ? (
                <>
                  <Marker position={normalized.o} icon={originIcon} />
                  <Marker position={normalized.o} icon={originLabelIcon} />
                </>
              ) : null}

              {normalized.d ? (
                <>
                  <Marker position={normalized.d} icon={destinationIcon} />
                  <Marker position={normalized.d} icon={destinationLabelIcon} />
                </>
              ) : null}

              {lastEventCoord ? (
                <>
                  <CircleMarker
                    center={lastEventCoord}
                    radius={12}
                    pathOptions={{
                      color: "#f59e0b",
                      weight: 2,
                      fillOpacity: 0,
                    }}
                    className="current-ring"
                  />
                  <Marker
                    position={lastEventCoord}
                    icon={currentIcon}
                    zIndexOffset={1000}
                  />
                  <Marker
                    position={lastEventCoord}
                    icon={currentLabelIcon}
                    zIndexOffset={1000}
                  />
                </>
              ) : null}
            </MapContainer>

            {!mapReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-slate-200 text-sm">
                Loading map...
              </div>
            ) : null}

            {mapReady && missingTileKey ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-slate-200 text-sm px-4 text-center">
                Missing NEXT_PUBLIC_MAPTILER_KEY. Add it to .env.local and
                restart the dev server.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Green = Origin • Amber = Current location • Blue = Destination
      </div>

      <style jsx global>{`
        .leaflet-container {
          font: inherit;
        }
        .leaflet-marker-dot {
          position: relative;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }
        .leaflet-marker-dot::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 32px;
          height: 32px;
          margin-left: -16px;
          margin-top: -16px;
          border-radius: 9999px;
          opacity: 0.6;
          animation: leafletPulse 1.9s ease-out infinite;
        }
        .marker-origin {
          background: #22c55e;
        }
        .marker-origin::after {
          background: rgba(34, 197, 94, 0.35);
        }
        .marker-destination {
          background: #3b82f6;
        }
        .marker-destination::after {
          background: rgba(59, 130, 246, 0.35);
        }
        .marker-current {
          background: #f59e0b;
        }
        .marker-current::after {
          background: rgba(245, 158, 11, 0.45);
          animation: leafletPulseActive 1.4s ease-out infinite;
        }
        @keyframes leafletPulse {
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
        @keyframes leafletPulseActive {
          0% {
            transform: scale(0.2);
            opacity: 0.9;
          }
          60% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .leaflet-route-label {
          background: rgba(248, 250, 252, 0.95);
          color: #0f172a;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
          transform: translate(-50%, -140%);
          white-space: nowrap;
        }
        .label-origin {
          border: 1px solid rgba(34, 197, 94, 0.5);
        }
        .label-destination {
          border: 1px solid rgba(59, 130, 246, 0.5);
        }
        .label-current {
          border: 1px solid rgba(245, 158, 11, 0.6);
          transform: translate(-50%, -180%);
        }
        .current-ring {
          animation: ringPulse 1.4s ease-out infinite;
        }
        @keyframes ringPulse {
          0% {
            stroke-opacity: 0.9;
            transform: scale(0.85);
          }
          70% {
            stroke-opacity: 0;
            transform: scale(1.35);
          }
          100% {
            stroke-opacity: 0;
            transform: scale(1.45);
          }
        }
        .route-glow {
          filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.6));
        }
        .route-line {
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>
    </div>
  );
}
