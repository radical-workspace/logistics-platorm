'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/app/auth/AuthProvider';
import DashboardTrackingPreview from '@/app/components/DashboardTrackingPreview';
import { apiFetch, apiUrl } from '@/lib/api';

import type { OverviewResponse } from '@/app/dashboard/page';

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
};

export default function AdminPage() {
  const { user, profile, isLoading } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user || !isAdmin) return;

    let active = true;
    setLoadingOverview(true);
    setOverviewError(null);

    const run = async () => {
      try {
        const res = await apiFetch('/api/dashboard/overview');
        const json = (await res.json()) as OverviewResponse & { error?: string };
        if (!active) return;
        if (!res.ok) {
          setOverview(null);
          setOverviewError(json.error || 'Unable to load admin metrics');
          return;
        }
        setOverview(json);
      } catch (err: unknown) {
        if (!active) return;
        setOverviewError(err instanceof Error ? err.message : 'Unable to load admin metrics');
        setOverview(null);
      } finally {
        if (!active) return;
        setLoadingOverview(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    let active = true;
    setLoadingAudit(true);
    setAuditError(null);

    const run = async () => {
      try {
        const res = await apiFetch('/api/admin/audit');
        const json = (await res.json()) as { audit?: AuditEntry[]; error?: string };
        if (!active) return;
        if (!res.ok) {
          setAuditEntries([]);
          setAuditError(json.error || 'Unable to load audit log');
          return;
        }
        setAuditEntries(json.audit ?? []);
      } catch (err: unknown) {
        if (!active) return;
        setAuditEntries([]);
        setAuditError(err instanceof Error ? err.message : 'Unable to load audit log');
      } finally {
        if (!active) return;
        setLoadingAudit(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [isAdmin, user]);

  const greeting = useMemo(() => {
    if (!profile?.display_name) return 'Admin control centre';
    return `Admin control — ${profile.display_name}`;
  }, [profile?.display_name]);

  const exports = useMemo(
    () => [
      {
        id: 'shipments',
        title: 'Shipments export',
        cadence: 'Latest 500',
        detail: 'Current shipment registry with statuses and last update timestamps.',
        href: apiUrl('/api/admin/exports/shipments'),
        filename: 'shipments.csv',
      },
      {
        id: 'vehicles',
        title: 'Vehicles export',
        cadence: 'Latest 500',
        detail: 'Fleet registry snapshot for compliance and dispatch review.',
        href: apiUrl('/api/admin/exports/vehicles'),
        filename: 'vehicles.csv',
      },
      {
        id: 'support_tickets',
        title: 'Support tickets export',
        cadence: 'Latest 500',
        detail: 'Customer support workload, priorities, and statuses.',
        href: apiUrl('/api/admin/exports/support_tickets'),
        filename: 'support_tickets.csv',
      },
      {
        id: 'audit_logs',
        title: 'Audit logs export',
        cadence: 'Latest 500',
        detail: 'Compliance-grade audit trail of administrative actions.',
        href: apiUrl('/api/admin/exports/audit_logs'),
        filename: 'audit_logs.csv',
      },
    ],
    []
  );

  const formatRelative = (value: string) => {
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
        <h1 className="text-3xl font-black">Admin</h1>
        <p className="mt-2 text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
        <h1 className="text-3xl font-black">Admin</h1>
        <p className="mt-2 text-slate-400">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Administration</p>
          <h1 className="text-3xl sm:text-4xl font-black">{greeting}</h1>
          <p className="text-slate-400 max-w-3xl">
            Govern users, shipments, and fleet. Use the shortcuts below to jump into operational consoles or export a current view.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/shipments" className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white">Shipments</Link>
            <Link href="/dashboard/vehicles" className="px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Vehicles</Link>
            <Link href="/dashboard/tracking" className="px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Tracking</Link>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{
            label: 'Shipments under management',
            value: overview?.stats.shipmentsTotal ?? 0,
            caption: 'Total consignments',
          }, {
            label: 'In transit',
            value: overview?.stats.inTransit ?? 0,
            caption: 'Air/road/sea moving now',
          }, {
            label: 'Pending release',
            value: overview?.stats.pending ?? 0,
            caption: 'Awaiting customs or dispatch',
          }, {
            label: 'Fleet count',
            value: overview?.stats.vehicleCount ?? 0,
            caption: 'Registered vehicles',
          }].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-sky-300">{card.value.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-500">{card.caption}</p>
            </div>
          ))}
        </section>

        {overviewError ? (
          <div className="rounded-xl border border-rose-700 bg-rose-900/30 p-4 text-rose-200">
            {overviewError}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Recent consignments</h2>
                  <p className="mt-1 text-slate-400 text-sm">
                    {loadingOverview ? 'Synchronising…' : `${overview?.stats.shipmentsTotal ?? 0} total consignments tracked.`}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {(overview?.recentShipments ?? []).map((shipment) => (
                  <li key={shipment.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-sky-300">{shipment.reference_number}</p>
                        <p className="text-slate-300 text-sm">{shipment.destination_address}</p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">Updated {formatRelative(shipment.updated_at)}</p>
                      </div>
                    </div>
                  </li>
                ))}
                {(overview?.recentShipments?.length ?? 0) === 0 ? (
                  <li className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-500">
                    {loadingOverview ? 'Loading…' : 'No consignments yet.'}
                  </li>
                ) : null}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-black">Mission alerts</h2>
              <ul className="mt-4 space-y-3">
                {(overview?.recentEvents ?? []).map((event) => (
                  <li key={event.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-sky-300">{event.reference_number}</p>
                        <p className="text-sm text-slate-200 font-semibold">{event.event_type.replace(/_/g, ' ')}</p>
                        {event.notes ? <p className="mt-1 text-xs text-slate-400">{event.notes}</p> : null}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatRelative(event.created_at)}</span>
                    </div>
                  </li>
                ))}
                {(overview?.recentEvents?.length ?? 0) === 0 ? (
                  <li className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
                    {loadingOverview ? 'Loading alerts…' : 'No alerts yet.'}
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-black">Controls</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>• Review shipments and update statuses in Shipments.</li>
                <li>• Assign drivers and vehicles to consignments.</li>
                <li>• Manage vehicle registry in Vehicles.</li>
              </ul>
            </section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Exports</h2>
                <p className="mt-1 text-slate-400 text-sm">Download operational datasets (admin-only).</p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Exports</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {exports.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.cadence}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={item.href}
                      className="inline-flex rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                      download={item.filename}
                    >
                      Download CSV
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Audit log</h2>
                <p className="mt-1 text-slate-400 text-sm">Recent administrative activity and policy changes.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Compliance</span>
            </div>
            <ul className="mt-4 space-y-3">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{entry.action}</p>
                      <p className="text-xs text-slate-400">By {entry.actor}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{formatRelative(entry.created_at)}</span>
                  </div>
                </li>
              ))}

              {auditError ? (
                <li className="rounded-xl border border-rose-700 bg-rose-900/30 p-4 text-sm text-rose-200">
                  {auditError}
                </li>
              ) : null}

              {!auditError && (auditEntries.length === 0) ? (
                <li className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
                  {loadingAudit ? 'Loading…' : 'No audit entries yet.'}
                </li>
              ) : null}
            </ul>
          </section>
        </div>

        <div className="mt-8">
          <DashboardTrackingPreview />
        </div>
      </div>
    </main>
  );
}
