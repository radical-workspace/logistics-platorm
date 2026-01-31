"use client";

import dynamic from "next/dynamic";

export type AdminLocationCorrectionMapProps = {
  center?: [number, number] | null;
  current?: [number, number] | null;
  draft?: [number, number] | null;
  onSelect: (coords: [number, number]) => void;
};

const AdminLocationCorrectionMap = dynamic<AdminLocationCorrectionMapProps>(
  () => import("./AdminLocationCorrectionMapLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 h-56 flex items-center justify-center text-slate-400 text-sm">
        Loading map...
      </div>
    ),
  },
);

export default AdminLocationCorrectionMap;
