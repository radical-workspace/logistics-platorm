import Link from 'next/link';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Shipment } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 20;
const allowedStatuses = new Set(['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled']);

function toInt(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toStr(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw || '').trim();
}

function buildHref(base: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = toInt(searchParams?.page, 1);
  const statusParam = toStr(searchParams?.status);
  const q = toStr(searchParams?.q).slice(0, 80);

  const status = allowedStatuses.has(statusParam) ? statusParam : '';

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from('shipments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (q) query = query.ilike('reference_number', `%${q}%`);

  const { data, error, count } = await query.range(start, end);
  const shipments = (data ?? []) as Shipment[];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const prevHref = buildHref('/dashboard/shipments', {
    page: prevPage === 1 ? undefined : String(prevPage),
    status: status || undefined,
    q: q || undefined,
  });

  const nextHref = buildHref('/dashboard/shipments', {
    page: String(nextPage),
    status: status || undefined,
    q: q || undefined,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Shipments</h1>
          <p className="mt-2 text-slate-400">{total} total</p>
        </div>
        <Link
          href="/dashboard/shipments/new"
          className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded font-semibold"
        >
          New shipment
        </Link>
      </div>

      {error ? (
        <div className="mt-4 bg-red-950/30 border border-red-900 text-red-200 rounded p-3">
          {error.message}
        </div>
      ) : null}

      {shipments.length === 0 && !error ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-2">No shipments found</h2>
          <p className="text-slate-400 mb-6">Try adjusting filters or create a shipment.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {shipments.map((s) => (
            <li key={s.id} className="bg-slate-900 border border-slate-800 rounded p-4">
              <div className="flex items-baseline justify-between gap-4">
                <Link className="font-mono text-blue-400 hover:text-blue-300" href={`/dashboard/shipments/${s.id}`}>
                  {s.reference_number}
                </Link>
                <div className="text-slate-300 text-sm">{s.status}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-end gap-2 text-sm text-slate-400">
        <span>
          {page} / {totalPages}
        </span>
        <Link
          aria-disabled={page <= 1}
          className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          href={prevHref}
        >
          Prev
        </Link>
        <Link
          aria-disabled={page >= totalPages}
          className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
          href={nextHref}
        >
          Next
        </Link>
      </div>
    </main>
  );
}
