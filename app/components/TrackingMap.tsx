"use client";

import dynamic from "next/dynamic";
import type { TrackingMapProps } from "./TrackingMap.types";

const TrackingMapLeaflet = dynamic<TrackingMapProps>(
  () => import("./TrackingMapLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6">
        <div className="text-slate-400 text-sm mb-2">Map</div>
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <div className="w-full h-80 flex items-center justify-center text-slate-200 text-sm">
            Loading map...
          </div>
        </div>
      </div>
    ),
  },
);

export default function TrackingMap(props: TrackingMapProps) {
  return <TrackingMapLeaflet {...props} />;
}
