'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseclient';
import { useAuth } from '@/app/auth/AuthProvider';
import type { Vehicle } from '@/lib/types';

export default function VehiclesPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || profile?.role === 'dispatcher';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        setVehicles([]);
        setLoading(false);
        return;
      }
      setVehicles((data as Vehicle[]) ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Vehicles</h1>
          <p className="mt-2 text-slate-400">Fleet inventory for your company.</p>
        </div>
        {canManage ? (
          <Link
            href="/dashboard/vehicles/new"
            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded font-semibold"
          >
            New vehicle
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 text-slate-400">Loading…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {vehicles.map((v) => (
            <li key={v.id} className="bg-slate-900 border border-slate-800 rounded p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <div className="font-semibold">{v.registration_number}</div>
                  <div className="text-slate-400 text-sm">{v.vehicle_type}</div>
                </div>
                <div className="text-slate-400 text-sm">
                  {v.is_active ? 'active' : 'inactive'}
                </div>
              </div>
            </li>
          ))}
          {vehicles.length === 0 ? <li className="text-slate-400">No vehicles yet.</li> : null}
        </ul>
      )}
    </main>
  );
}
