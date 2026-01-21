'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseclient';
import { useAuth } from '@/app/auth/AuthProvider';
import { shipmentSchema } from '@/lib/validators';

type FormState = {
  company_id: string;
  customer_id: string;
  reference_number: string;
  origin_address: string;
  destination_address: string;
  weight_kg: string;
  description: string;
  estimated_delivery: string;
};

export default function NewShipmentPage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();

  const canCreate = profile?.role === 'admin' || profile?.role === 'dispatcher';

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    company_id: profile?.company_id ?? '',
    customer_id: '',
    reference_number: '',
    origin_address: '',
    destination_address: '',
    weight_kg: '',
    description: '',
    estimated_delivery: '',
  });

  const parsedWeight = useMemo(() => {
    const trimmed = form.weight_kg.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : undefined;
  }, [form.weight_kg]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error('You do not have permission to create shipments');
      return;
    }

    setSaving(true);
    try {
      shipmentSchema.parse({
        origin_address: form.origin_address,
        destination_address: form.destination_address,
        weight_kg: parsedWeight ?? 1,
        description: form.description || undefined,
        estimated_delivery: form.estimated_delivery || undefined,
      });

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          company_id: form.company_id,
          customer_id: form.customer_id,
          reference_number: form.reference_number,
          origin_address: form.origin_address,
          destination_address: form.destination_address,
          weight_kg: parsedWeight ?? null,
          description: form.description || null,
          estimated_delivery: form.estimated_delivery ? new Date(form.estimated_delivery).toISOString() : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Shipment created');
      router.push(`/dashboard/shipments/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create shipment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!canCreate) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">Only dispatchers and admins can create shipments.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">Create a shipment record for tracking and dispatch.</p>

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
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="customer_id">
              Customer ID
            </label>
            <input
              id="customer_id"
              value={form.customer_id}
              onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="UUID"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="reference_number">
              Reference number
            </label>
            <input
              id="reference_number"
              value={form.reference_number}
              onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="e.g. AFG-2026-0001"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="origin_address">
              Origin address
            </label>
            <input
              id="origin_address"
              value={form.origin_address}
              onChange={(e) => setForm((f) => ({ ...f, origin_address: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="destination_address">
              Destination address
            </label>
            <input
              id="destination_address"
              value={form.destination_address}
              onChange={(e) => setForm((f) => ({ ...f, destination_address: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="weight_kg">
              Weight (kg)
            </label>
            <input
              id="weight_kg"
              value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="estimated_delivery">
              Estimated delivery
            </label>
            <input
              id="estimated_delivery"
              type="datetime-local"
              value={form.estimated_delivery}
              onChange={(e) => setForm((f) => ({ ...f, estimated_delivery: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              rows={4}
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
            >
              {saving ? 'Creating…' : 'Create shipment'}
            </button>
            <button
              type="button"
              className="bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded font-semibold"
              onClick={() => router.push('/dashboard/shipments')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
