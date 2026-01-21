'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns'; 
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/auth/AuthProvider';
import DashboardTrackingPreview from '@/app/components/DashboardTrackingPreview';
import { apiFetch } from '@/lib/api';

export type OverviewResponse = {
  profile: {
    email: string;
    display_name: string | null;
    role: string;
  };
  stats: {
    shipmentsTotal: number;
    inTransit: number;
    delivered: number;
    pending: number;
    vehicleCount: number;
  };
  recentShipments: Array<{
    id: string;
    reference_number: string;
    status: string;
    destination_address: string;
    updated_at: string;
  }>;
  recentEvents: Array<{
    id: string;
    event_type: string;
    created_at: string;
    notes: string | null;
    reference_number: string;
  }>;
};

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/dashboard/auth/login');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user) return;

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
          setOverviewError(json.error || 'Unable to load dashboard metrics');
          return;
        }
        setOverview(json);
      } catch (err: unknown) {
        if (!active) return;
        setOverviewError(err instanceof Error ? err.message : 'Unable to load dashboard metrics');
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
  }, [user]);
  const greeting = useMemo(() => {
    if (!profile?.display_name) return 'Welcome back to the control tower';
    return `Welcome back, ${profile.display_name}`;
  }, [profile?.display_name]);

  const formatRelative = (value: string) => {
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  const notifications = useMemo(() => {
    return (overview?.recentEvents ?? []).map((event) => ({
      id: event.id,
      title: event.event_type.replace(/_/g, ' '),
      detail: event.notes || 'Operational update from mission control',
      created_at: event.created_at,
      reference: event.reference_number,
    }));
  }, [overview?.recentEvents]);

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Add a subject and message.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await apiFetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          priority: ticketPriority,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to raise a support ticket');
      }

      toast.success('Support ticket submitted');
      setTicketSubject('');
      setTicketMessage('');
      setTicketPriority('normal');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to raise a support ticket';
      toast.error(message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-2 text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-2 text-slate-400">Redirecting to login…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Operations Command Centre</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black">{greeting}</h1>
            <p className="mt-3 text-slate-400 max-w-2xl">
              Monitor network performance, track live consignments, and coordinate multimodal moves directly from your
              AFGHCO mission console.
            </p>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[{
              label: 'Active consignments',
              value: overview?.stats.inTransit ?? 0,
              caption: 'Currently airborne / en route',
            }, {
              label: 'Deliveries cleared',
              value: overview?.stats.delivered ?? 0,
              caption: 'Completed in the past cycle',
            }, {
              label: 'Pending release',
              value: overview?.stats.pending ?? 0,
              caption: 'Awaiting customs or dispatch',
            }, {
              label: 'Fleet ready',
              value: overview?.stats.vehicleCount ?? 0,
              caption: 'Vehicles available within SLA',
            }].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400 uppercase tracking-[0.2em]">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-sky-300">{card.value.toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-500">{card.caption}</p>
              </div>
            ))}
          </section>
        </div>

        {overviewError ? (
          <div className="mt-6 rounded-xl border border-rose-700 bg-rose-900/30 p-4 text-rose-200">
            {overviewError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Network status</h2>
                  <p className="mt-1 text-slate-400 text-sm">
                    {loadingOverview ? 'Synchronising latest telemetry…' : `${overview?.stats.shipmentsTotal ?? 0} consignments under management.`}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-lg font-semibold text-slate-200">Live consignments</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Flights and convoys tracked with live telemetry and alerts for customs, weather, and risk advisories.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>• Satellite-backed visibility across Afghan air corridors</li>
                    <li>• Escalation protocols for SLA deviation and route variance</li>
                    <li>• Automated status messaging to government and NGO stakeholders</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-lg font-semibold text-slate-200">Readiness posture</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Fleet, crews, and bonded storage aligned with today&rsquo;s uplift plan and humanitarian air bridge commitments.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>• Kabul, Kandahar, and Mazar distribution hubs fully staffed</li>
                    <li>• Medical supply lane secured with cold-chain validation</li>
                    <li>• Border documentation packages pre-cleared and archived</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Recent consignments</h2>
                <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Live feed</span>
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
                    No consignments yet — once bookings are raised they will appear here automatically.
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
                    No event alerts just yet. Realtime milestones will stream here as consignments update.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Notifications</h2>
                <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Realtime</span>
              </div>
              <ul className="mt-4 space-y-3">
                {notifications.map((item) => (
                  <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-sky-300">{item.reference}</p>
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatRelative(item.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-black">Control checklist</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>• Verify customs dossiers issued for outbound flights</li>
                <li>• Confirm humanitarian cargo separation protocols</li>
                <li>• Sync convoy manifests with provincial security partners</li>
                <li>• Validate telematics uptime across cold-chain fleet</li>
              </ul>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Support</h2>
                  <p className="mt-1 text-slate-400 text-sm">Need ops support or escalation? Raise a ticket with mission control.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.4em] text-slate-500">24/7</span>
              </div>
              <form className="mt-4 space-y-3" onSubmit={submitTicket}>
                <div className="space-y-2">
                  <label htmlFor="ticketSubject" className="text-xs uppercase tracking-[0.2em] text-slate-500">Subject</label>
                  <input
                    id="ticketSubject"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    placeholder="e.g., Cold chain sensor alert"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="ticketPriority" className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</label>
                    <select
                      id="ticketPriority"
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as 'low' | 'normal' | 'high')}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ticketMessage" className="text-xs uppercase tracking-[0.2em] text-slate-500">Message</label>
                  <textarea
                    id="ticketMessage"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    rows={4}
                    placeholder="Describe the issue, route, and consignments impacted"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingTicket ? 'Submitting…' : 'Submit support ticket'}
                </button>
              </form>
            </section>
          </div>
        </div>

        <div className="mt-8">
          <DashboardTrackingPreview />
        </div>
      </div>
    </main>
  );
}
