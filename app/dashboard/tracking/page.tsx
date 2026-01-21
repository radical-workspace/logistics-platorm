'use client';

import DashboardTrackingPreview from '@/app/components/DashboardTrackingPreview';

export default function DashboardTrackingPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-black">Tracking</h1>
      <p className="mt-2 text-slate-400 text-sm sm:text-base">
        Track shipments from inside the dashboard.
      </p>
      <div className="mt-4">
        <DashboardTrackingPreview />
      </div>
    </div>
  );
}
