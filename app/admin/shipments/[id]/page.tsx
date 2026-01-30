'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/client/supabaseclient';
import { apiFetch } from '@/lib/client/api';
import type { Shipment, ShipmentEvent } from '@/lib/shared/types';

type ShipmentStatus = Shipment['status'];

type DriverOption = {
  id: string;
  display_name: string | null;
  email: string;
};

type VehicleOption = {
  id: string;
  registration_number: string;
  vehicle_type: string;
};

type DispatcherOption = {
  id: string;
  display_name: string | null;
  email: string;
};

export default function AdminShipmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shipmentId = params?.id;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<ShipmentStatus>('pending');
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const [dispatchers, setDispatchers] = useState<DispatcherOption[]>([]);
  const [assignedDispatcherId, setAssignedDispatcherId] = useState<string>('');
  const [dispatcherSaving, setDispatcherSaving] = useState(false);

  const [eventType, setEventType] = useState('milestone');
  const [eventNotes, setEventNotes] = useState('');
  const [eventSaving, setEventSaving] = useState(false);

  const title = useMemo(() => {
    if (!shipment) return 'Shipment';
    return shipment.reference_number;
  }, [shipment]);

  useEffect(() => {
    if (!shipmentId) return;
    let active = true;

    const load = async () => {
      setLoading(true);

      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (!active) return;
      if (shipmentError) {
        toast.error(shipmentError.message);
        setShipment(null);
        setEvents([]);
        setDrivers([]);
        setVehicles([]);
        setLoading(false);
        return;
      }

      const nextShipment = shipmentData as Shipment;
      setShipment(nextShipment);
      setStatus(nextShipment.status);
      setAssignedDriverId(nextShipment.assigned_driver_id ?? '');
      setAssignedVehicleId(nextShipment.assigned_vehicle_id ?? '');
      setAssignedDispatcherId(nextShipment.assigned_dispatcher_id ?? '');

      const [{ data: eventRows }, driverRowsRes, vehicleRowsRes, dispatcherRowsRes] = await Promise.all([
        supabase
          .from('shipment_events')
          .select('*')
          .eq('shipment_id', shipmentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id,email,display_name')
          .eq('role', 'driver')
          .eq('company_id', nextShipment.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('vehicles')
          .select('id,registration_number,vehicle_type')
          .eq('company_id', nextShipment.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id,email,display_name')
          .eq('role', 'dispatcher')
          .eq('company_id', nextShipment.company_id)
          .order('created_at', { ascending: false }),
      ]);

      if (!active) return;
      setEvents((eventRows as ShipmentEvent[]) ?? []);
      setDrivers(((driverRowsRes.data ?? []) as DriverOption[]) ?? []);
      setVehicles(((vehicleRowsRes.data ?? []) as VehicleOption[]) ?? []);
      setDispatchers(((dispatcherRowsRes.data ?? []) as DispatcherOption[]) ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [shipmentId]);

  const reloadEvents = async () => {
    if (!shipmentId) return;
    const { data } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });
    setEvents((data as ShipmentEvent[]) ?? []);
  };

  const onAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentId) return;

    setSavingUpdate(true);
    try {
      const current_latitude = latitude.trim() ? Number(latitude) : null;
      const current_longitude = longitude.trim() ? Number(longitude) : null;

      const res = await apiFetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status,
          current_location_label: locationLabel.trim() || null,
          current_latitude,
          current_longitude,
          notes: notes.trim() || null,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; shipment?: Shipment; event?: ShipmentEvent; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Update failed');
      }

      if (json.shipment) {
        setShipment(json.shipment);
        setStatus(json.shipment.status);
      }
      if (json.event) {
        setEvents((prev) => [json.event as ShipmentEvent, ...prev]);
      } else {
        await reloadEvents();
      }

      toast.success('Shipment updated');
      setNotes('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.error(message);
    } finally {
      setSavingUpdate(false);
    }
  };

  const updateDispatcher = async () => {
    if (!shipmentId) return;

    setDispatcherSaving(true);
    try {
      const nextAssignedDispatcher = assignedDispatcherId.trim() || null;

      const res = await apiFetch(`/api/admin/shipments/${encodeURIComponent(shipmentId)}/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assigned_dispatcher_id: nextAssignedDispatcher,
          notes: nextAssignedDispatcher ? 'Dispatcher assigned' : 'Dispatcher unassigned',
        }),
      });

      const json = (await res.json()) as { ok?: boolean; shipment?: Shipment; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to update dispatcher');

      if (json.shipment) setShipment(json.shipment);
      toast.success('Dispatcher updated');
      await reloadEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update dispatcher';
      toast.error(message);
    } finally {
      setDispatcherSaving(false);
    }
  };

  const updateAssignment = async () => {
    if (!shipmentId) return;
    if (!shipment) return;

    setAssignmentSaving(true);
    try {
      const nextAssignedDriver = assignedDriverId.trim() || null;
      const nextAssignedVehicle = assignedVehicleId.trim() || null;

      const res = await apiFetch(`/api/shipments/${encodeURIComponent(shipmentId)}/assignment`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assigned_driver_id: nextAssignedDriver,
          assigned_vehicle_id: nextAssignedVehicle,
        }),
      });

      const json = (await res.json()) as { shipment?: Shipment; error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to update assignment');

      if (json.shipment) {
        setShipment(json.shipment);
      }

      toast.success('Assignment updated');
      await reloadEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment';
      toast.error(message);
    } finally {
      setAssignmentSaving(false);
    }
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentId) return;

    const trimmedType = eventType.trim();
    if (!trimmedType) {
      toast.error('Event type is required');
      return;
    }

    setEventSaving(true);
    try {
      const res = await apiFetch(`/api/shipments/${encodeURIComponent(shipmentId)}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event_type: trimmedType,
          notes: eventNotes.trim() ? eventNotes.trim() : null,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to add event');

      toast.success('Event added');
      setEventType('milestone');
      setEventNotes('');
      await reloadEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add event';
      toast.error(message);
    } finally {
      setEventSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Admin shipment console</p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            <p className="mt-2 text-slate-400">Action-first controls for status, assignment, and tracking events.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 transition border border-slate-800 rounded px-4 py-2 text-sm font-semibold"
              onClick={() => router.push('/admin/shipments')}
            >
              Back to list
            </button>
            {shipmentId ? (
              <Link
                href={`/dashboard/shipments/${encodeURIComponent(shipmentId)}`}
                className="bg-slate-900 hover:bg-slate-800 transition border border-slate-800 rounded px-4 py-2 text-sm font-semibold"
              >
                Open in dashboard
              </Link>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-slate-400">Loading…</p>
        ) : !shipment ? (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            Shipment not found.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <div className="text-slate-400 text-sm">Reference</div>
                    <div className="text-xl font-bold">{shipment.reference_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-sm">Status</div>
                    <div className="text-lg font-semibold">{shipment.status}</div>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-slate-400 text-sm">Origin</div>
                    <div className="text-slate-200">{shipment.origin_address}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Destination</div>
                    <div className="text-slate-200">{shipment.destination_address}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Company</div>
                    <div className="font-mono text-xs text-slate-300 break-all">{shipment.company_id}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Customer</div>
                    <div className="font-mono text-xs text-slate-300 break-all">
                      {shipment.customer_id || '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold">Events</h2>
                {events.length === 0 ? (
                  <p className="mt-3 text-slate-400">No events yet.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {events.map((ev) => (
                      <li key={ev.id} className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-semibold">{ev.event_type}</div>
                          <div className="text-slate-500 text-sm">{ev.created_at}</div>
                        </div>
                        {(ev.latitude !== undefined || ev.longitude !== undefined) ? (
                          <div className="mt-2 text-xs font-mono text-slate-500">
                            {ev.latitude ?? '—'}, {ev.longitude ?? '—'}
                          </div>
                        ) : null}
                        {ev.notes ? <div className="mt-2 text-slate-300">{ev.notes}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div id="update-status" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold">Status + location update</h2>
                <p className="mt-2 text-sm text-slate-400">
                  This writes shipment status and logs a location event for tracking.
                </p>

                <form className="mt-4 grid gap-4" onSubmit={onAdminUpdate}>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                    >
                      <option value="pending">Pending</option>
                      <option value="picked_up">Picked up</option>
                      <option value="in_transit">In transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="current_location_label">
                      Current location
                    </label>
                    <input
                      id="current_location_label"
                      value={locationLabel}
                      onChange={(e) => setLocationLabel(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                      placeholder="e.g. Ikeja, Lagos"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2" htmlFor="current_latitude">
                        Latitude
                      </label>
                      <input
                        id="current_latitude"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                        inputMode="decimal"
                        placeholder="6.6018"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2" htmlFor="current_longitude">
                        Longitude
                      </label>
                      <input
                        id="current_longitude"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                        inputMode="decimal"
                        placeholder="3.3515"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="notes">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                      rows={3}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={savingUpdate}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
                    >
                      {savingUpdate ? 'Saving…' : 'Save update'}
                    </button>
                  </div>
                </form>
              </div>

              <div id="dispatcher" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold">Assign dispatcher</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Set operational ownership (admin-only).
                </p>

                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="assigned_dispatcher">
                      Dispatcher
                    </label>
                    <select
                      id="assigned_dispatcher"
                      value={assignedDispatcherId}
                      onChange={(e) => setAssignedDispatcherId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                    >
                      <option value="">Unassigned</option>
                      {dispatchers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {(d.display_name ? `${d.display_name} — ` : '') + d.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={dispatcherSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
                      onClick={() => void updateDispatcher()}
                    >
                      {dispatcherSaving ? 'Saving…' : 'Save dispatcher'}
                    </button>
                  </div>
                </div>
              </div>

              <div id="assignment" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold">Assignment</h2>
                <p className="mt-2 text-sm text-slate-400">Assign a driver and vehicle to the shipment.</p>

                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="assigned_driver">
                      Driver
                    </label>
                    <select
                      id="assigned_driver"
                      value={assignedDriverId}
                      onChange={(e) => setAssignedDriverId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {(d.display_name ? `${d.display_name} — ` : '') + d.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="assigned_vehicle">
                      Vehicle
                    </label>
                    <select
                      id="assigned_vehicle"
                      value={assignedVehicleId}
                      onChange={(e) => setAssignedVehicleId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                    >
                      <option value="">Unassigned</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registration_number} ({v.vehicle_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={assignmentSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
                      onClick={() => void updateAssignment()}
                    >
                      {assignmentSaving ? 'Saving…' : 'Save assignment'}
                    </button>
                  </div>
                </div>
              </div>

              <div id="events" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold">Add event</h2>
                <p className="mt-2 text-sm text-slate-400">Append a milestone or note to the timeline.</p>

                <form className="mt-4 grid gap-4" onSubmit={addEvent}>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="event_type">
                      Event type
                    </label>
                    <input
                      id="event_type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                      placeholder="e.g. arrived_hub, note, customs_hold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2" htmlFor="event_notes">
                      Notes
                    </label>
                    <textarea
                      id="event_notes"
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                      rows={3}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={eventSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
                    >
                      {eventSaving ? 'Adding…' : 'Add event'}
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
