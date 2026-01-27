import Link from 'next/link';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import type { Shipment } from '@/lib/shared/types';

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

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};

  const page = toInt(sp.page, 1);
  const statusParam = toStr(sp.status);
  const q = toStr(sp.q).slice(0, 80);
  const status = allowedStatuses.has(statusParam) ? statusParam : '';

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from('shipments')
    .select('id,reference_number,status,origin_address,destination_address,updated_at,company_id,customer_id', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (q) query = query.ilike('reference_number', `%${q}%`);

  const { data, error, count } = await query.range(start, end);
  const shipments = (data ?? []) as Array<
    Pick<
      Shipment,
      | 'id'
      | 'company_id'
      | 'customer_id'
      | 'reference_number'
      | 'status'
      | 'origin_address'
      | 'destination_address'
      | 'updated_at'
    >
  >;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const prevHref = buildHref('/admin/shipments', {
    page: prevPage === 1 ? undefined : String(prevPage),
    status: status || undefined,
    q: q || undefined,
  });

  const nextHref = buildHref('/admin/shipments', {
    page: String(nextPage),
    status: status || undefined,
    q: q || undefined,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Shipments</h1>
            <p className="mt-2 text-slate-400">{total} total</p>
          </div>

          <Link
            href="/dashboard/shipments/new"
            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded font-semibold"
          >
            Create Shipment
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3" action="/admin/shipments" method="get">
          <div className="flex flex-col gap-1">
            <label htmlFor="q" className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Search reference
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="e.g. E2E-20260127-35045"
              className="w-72 max-w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="picked_up">picked_up</option>
              <option value="in_transit">in_transit</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 transition border border-slate-800 rounded px-4 py-2 text-sm font-semibold"
          >
            Apply
          </button>

          {q || status ? (
            <Link
              href="/admin/shipments"
              className="bg-slate-900 hover:bg-slate-800 transition border border-slate-800 rounded px-4 py-2 text-sm font-semibold"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {error ? (
          <div className="bg-red-950/30 border border-red-900 text-red-200 rounded p-3">
            {error.message}
          </div>
        ) : null}

        {shipments.length === 0 && !error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            No shipments found.
          </div>
        ) : (
          <ul className="space-y-2">
            {shipments.map((s) => (
              <li key={s.id} className="bg-slate-900 border border-slate-800 rounded p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <Link
                        className="font-mono text-blue-400 hover:text-blue-300 break-all"
                        href={`/admin/shipments/${s.id}`}
                      >
                        {s.reference_number}
                      </Link>
                      <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{s.status}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      <span className="text-slate-500">From:</span> {s.origin_address}
                    </div>
                    <div className="text-sm text-slate-300">
                      <span className="text-slate-500">To:</span> {s.destination_address}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Updated {new Date(s.updated_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/shipments/${s.id}`}
                      className="bg-slate-950/30 hover:bg-slate-950/50 transition border border-slate-800 rounded px-3 py-2 text-sm font-semibold"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/shipments/${s.id}#update-status`}
                      className="bg-slate-950/30 hover:bg-slate-950/50 transition border border-slate-800 rounded px-3 py-2 text-sm font-semibold"
                    >
                      Update Status
                    </Link>
                    <Link
                      href={`/admin/shipments/${s.id}#events`}
                      className="bg-slate-950/30 hover:bg-slate-950/50 transition border border-slate-800 rounded px-3 py-2 text-sm font-semibold"
                    >
                      Update Location / Add Event
                    </Link>
                    <Link
                      href={`/admin/shipments/${s.id}#assignment`}
                      className="bg-slate-950/30 hover:bg-slate-950/50 transition border border-slate-800 rounded px-3 py-2 text-sm font-semibold"
                    >
                      Assign Dispatcher
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 text-sm text-slate-400">
          <span>
            {page} / {totalPages}
          </span>
          <Link
            aria-disabled={page <= 1}
            className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${
              page <= 1 ? 'pointer-events-none opacity-50' : ''
            }`}
            href={prevHref}
          >
            Prev
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${
              page >= totalPages ? 'pointer-events-none opacity-50' : ''
            }`}
            href={nextHref}
          >
            Next
          </Link>
        </div>
      </div>
    </main>
  );
}
