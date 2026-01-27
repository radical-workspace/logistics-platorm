import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Shipment } from "@/lib/shared/types";
import { publicEnv } from "@/lib/env/public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 20;
const allowedStatuses = new Set([
  "pending",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
]);

function toInt(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toStr(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw || "").trim();
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

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  // ✅ Next.js expects searchParams to be a Promise in server pages (newer Next versions)
  const sp = (await searchParams) ?? {};

  const cookieStore = await cookies();
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op in Server Components (read-only cookies). Route handlers/middleware handle refresh.
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-black">Shipments</h1>
        <p className="mt-2 text-slate-400">Please sign in to view shipments.</p>
      </main>
    );
  }

  const { data: me, error: meError } = await supabase
    .from("profiles")
    .select("id,role,company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (meError || !me?.role) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-black">Shipments</h1>
        <p className="mt-2 text-slate-400">Unable to load your profile.</p>
      </main>
    );
  }

  // ✅ Use sp (awaited searchParams), not searchParams directly
  const page = toInt(sp.page, 1);
  const statusParam = toStr(sp.status);
  const q = toStr(sp.q).slice(0, 80);

  const status = allowedStatuses.has(statusParam) ? statusParam : "";

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let query = supabase
    .from("shipments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (me.role === "dispatcher" && me.company_id) {
    query = query.eq("company_id", me.company_id);
  }

  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("reference_number", `%${q}%`);

  const { data, error, count } = await query.range(start, end);
  const shipments = (data ?? []) as Shipment[];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const prevHref = buildHref("/dashboard/shipments", {
    page: prevPage === 1 ? undefined : String(prevPage),
    status: status || undefined,
    q: q || undefined,
  });

  const nextHref = buildHref("/dashboard/shipments", {
    page: String(nextPage),
    status: status || undefined,
    q: q || undefined,
  });

  const isAdmin = me.role === "admin";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Shipments</h1>
          <p className="mt-2 text-slate-400">{total} total</p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/shipments/new"
            className="border rounded px-3 py-2 text-sm"
          >
            Create Shipment
          </Link>
        )}
      </div>

      {error ? (
        <div className="mt-4 bg-red-950/30 border border-red-900 text-red-200 rounded p-3">
          {error.message}
        </div>
      ) : null}

      {shipments.length === 0 && !error ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-2">No shipments found</h2>
          <p className="text-slate-400 mb-6">
            Try adjusting filters or create a shipment.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {shipments.map((s) => (
            <li
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded p-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <Link
                  className="font-mono text-blue-400 hover:text-blue-300"
                  href={`/dashboard/shipments/${s.id}`}
                >
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
          className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
          href={prevHref}
        >
          Prev
        </Link>
        <Link
          aria-disabled={page >= totalPages}
          className={`bg-slate-900 border border-slate-800 rounded px-3 py-2 ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
          href={nextHref}
        >
          Next
        </Link>
      </div>
    </main>
  );
}
