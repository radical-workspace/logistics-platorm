type SimulatedMapPreviewProps = {
  title?: string;
  subtitle?: string;
  heightClassName?: string;
};

export default function SimulatedMapPreview({
  title = 'Map preview',
  subtitle = 'Simulated map view (mobile-first)',
  heightClassName = 'h-[260px] sm:h-[340px]',
}: SimulatedMapPreviewProps) {
  return (
    <div className="mt-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 pt-4">
        <div className="text-slate-200 font-semibold">{title}</div>
        <div className="mt-1 text-slate-400 text-sm">{subtitle}</div>
      </div>

      <div className={`relative ${heightClassName} mt-3`}> 
        {/* simple "roads" */}
        <div className="absolute inset-0">
          <div className="absolute left-6 right-6 top-10 h-px bg-slate-800" />
          <div className="absolute left-10 top-6 bottom-10 w-px bg-slate-800" />
          <div className="absolute right-10 top-14 bottom-6 w-px bg-slate-800" />
          <div className="absolute left-16 right-20 bottom-12 h-px bg-slate-800" />
          <div className="absolute left-1/4 top-1/3 right-16 h-px bg-slate-800/70" />
          <div className="absolute left-20 top-1/2 bottom-8 w-px bg-slate-800/70" />
        </div>

        {/* markers */}
        <div className="absolute left-10 top-14 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/15" />
        <div className="absolute right-14 bottom-16 w-3 h-3 rounded-full bg-slate-200 ring-4 ring-slate-200/10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-300 ring-4 ring-blue-300/15" />

        {/* route */}
        <div className="absolute left-12 top-16 right-16 bottom-16 border border-dashed border-slate-800 rounded-2xl" />

        {/* overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-slate-950/70" />
      </div>

      <div className="px-4 pb-4 text-xs text-slate-500">
        This placeholder is shown when live map data isn’t available yet.
      </div>
    </div>
  );
}
