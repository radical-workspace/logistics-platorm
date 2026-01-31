"use client";

import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AdminLocationCorrectionMapProps } from "./AdminLocationCorrectionMap";

function ClickHandler({ onSelect }: { onSelect: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function AdminLocationCorrectionMapLeaflet({
  center,
  current,
  draft,
  onSelect,
}: AdminLocationCorrectionMapProps) {
  const initialCenter: [number, number] = center ?? current ?? [0, 0];

  return (
    <div className="h-56">
      <MapContainer
        center={initialCenter}
        zoom={current ? 6 : 2}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelect={onSelect} />
        {current ? (
          <CircleMarker
            center={current}
            radius={6}
            pathOptions={{
              color: "#22c55e",
              weight: 2,
              fillColor: "#22c55e",
              fillOpacity: 0.9,
            }}
          />
        ) : null}
        {draft ? (
          <CircleMarker
            center={draft}
            radius={7}
            pathOptions={{
              color: "#f59e0b",
              weight: 2,
              fillColor: "#f59e0b",
              fillOpacity: 1,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
