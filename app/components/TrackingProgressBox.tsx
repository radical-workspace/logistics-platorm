type TrackData = {
  reference_number: string;
  status: string | null;
  origin_address: string | null;
  destination_address: string | null;
  last_event_notes: string | null;
  last_event_at: string | null;
  last_event_lat: number | string | null;
  last_event_lng: number | string | null;
};

function titleCaseStatus(status: string | null) {
  if (!status) return "—";
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function progressFromStatus(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (!s) return { pct: 10, caption: "Preparing shipment" };
  if (s.includes("pending")) return { pct: 15, caption: "Preparing shipment" };
  if (s.includes("picked")) return { pct: 35, caption: "Picked up" };
  if (s.includes("transit")) return { pct: 60, caption: "In transit" };
  if (s.includes("delivered")) return { pct: 100, caption: "Delivered" };
  if (s.includes("cancel")) return { pct: 100, caption: "Cancelled" };
  return { pct: 45, caption: "Processing" };
}

export default function TrackingProgressBox({ data }: { data: TrackData }) {
  const statusLabel = titleCaseStatus(data.status);
  const currentLocation = data.last_event_notes?.trim() || "—";
  const origin = data.origin_address?.trim() || "—";
  const destination = data.destination_address?.trim() || "—";
  const lastUpdate = formatWhen(data.last_event_at);

  const { pct, caption } = progressFromStatus(data.status);
  const safePct = clamp(pct, 0, 100);

  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black tracking-wide text-slate-100">
            Shipment progress
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Visual confirmation of movement for this tracking ID.
          </p>
        </div>

        <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200">
          {statusLabel}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Current location</span>
          <span className="font-semibold text-slate-100">{currentLocation}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Route</span>
          <span className="text-slate-100">
            {origin} <span className="text-slate-500">→</span>{" "}
            <span className="font-extrabold text-blue-400">{currentLocation}</span>{" "}
            <span className="text-slate-500">→</span> {destination}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Last update</span>
          <span className="text-slate-100">{lastUpdate}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{ width: `${safePct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-400">{caption}</div>
      </div>

      {(data.last_event_lat != null || data.last_event_lng != null) && (
        <div className="mt-3 text-xs text-slate-500">
          Coordinates:{" "}
          <span className="text-slate-300">
            {data.last_event_lat ?? "—"}, {data.last_event_lng ?? "—"}
          </span>
        </div>
      )}
    </section>
  );
}
