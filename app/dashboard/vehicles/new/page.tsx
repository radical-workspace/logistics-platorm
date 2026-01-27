'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/client/supabaseclient';
import { useAuth } from '@/app/auth/AuthProvider';

type FormState = {
  company_id: string;
  registration_number: string;
  vehicle_type: 'truck' | 'van' | 'motorcycle' | 'aircraft';
  capacity_kg: string;
};

export default function NewVehiclePage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();

  const canCreate = profile?.role === 'admin' || profile?.role === 'dispatcher';

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    company_id: profile?.company_id ?? '',
    registration_number: '',
    vehicle_type: 'truck',
    capacity_kg: '',
  });

  const capacity = useMemo(() => {
    const trimmed = form.capacity_kg.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }, [form.capacity_kg]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error('You do not have permission to create vehicles');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        company_id: form.company_id,
        registration_number: form.registration_number,
        vehicle_type: form.vehicle_type,
        capacity_kg: capacity,
      });

      if (error) throw error;

      toast.success('Vehicle created');
      router.push('/dashboard/vehicles');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create vehicle';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New vehicle</h1>
        <p className="mt-2 text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!canCreate) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New vehicle</h1>
        <p className="mt-2 text-slate-400">Only dispatchers and admins can create vehicles.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-black">New vehicle</h1>
        <p className="mt-2 text-slate-400">Add a vehicle to the fleet.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="company_id">
              Company ID
            </label>
            <input
              id="company_id"
              value={form.company_id}
              onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="UUID"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="registration_number">
              Registration number
            </label>
            <input
              id="registration_number"
              value={form.registration_number}
              onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="e.g. AFG-TRK-0007"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="vehicle_type">
              Vehicle type
            </label>
            <select
              id="vehicle_type"
              value={form.vehicle_type}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value as FormState['vehicle_type'] }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
            >
              <option value="truck">truck</option>
              <option value="van">van</option>
              <option value="motorcycle">motorcycle</option>
              <option value="aircraft">aircraft</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="capacity_kg">
              Capacity (kg)
            </label>
            <input
              id="capacity_kg"
              value={form.capacity_kg}
              onChange={(e) => setForm((f) => ({ ...f, capacity_kg: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
            >
              {saving ? 'Creating…' : 'Create vehicle'}
            </button>
            <button
              type="button"
              className="bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded font-semibold"
              onClick={() => router.push('/dashboard/vehicles')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

