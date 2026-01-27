'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/client/supabaseclient';
import type { Shipment, ShipmentEvent } from '@/lib/shared/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/app/auth/AuthProvider';
import { apiFetch } from '@/lib/client/api';

type EventFormState = {
  event_type: string;
  notes: string;
};

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

export default function ShipmentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shipmentId = params?.id;

  const { user, profile } = useAuth();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventSaving, setEventSaving] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>({
    event_type: 'status_update',
    notes: '',
  });

  const [statusSaving, setStatusSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState<ShipmentStatus>('pending');

  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');

  const canAddEvent = !!user && (!profile || profile.role === 'admin' || profile.role === 'dispatcher' || profile.role === 'driver');
  const canUpdateShipment = !!user && profile?.role === 'admin';

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
        setLoading(false);
        return;
      }

      const nextShipment = shipmentData as Shipment;
      setShipment(nextShipment);
      setNextStatus(nextShipment.status);
      setAssignedDriverId(nextShipment.assigned_driver_id ?? '');
      setAssignedVehicleId(nextShipment.assigned_vehicle_id ?? '');

      if (canUpdateShipment) {
        const companyId = nextShipment.company_id;

        const { data: driverRows } = await supabase
          .from('profiles')
          .select('id,email,display_name')
          .eq('role', 'driver')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (!active) return;
        setDrivers((driverRows as DriverOption[]) ?? []);

        const { data: vehicleRows } = await supabase
          .from('vehicles')
          .select('id,registration_number,vehicle_type')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (!active) return;
        setVehicles((vehicleRows as VehicleOption[]) ?? []);
      }

      const { data: eventData } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (!active) return;
      setEvents((eventData as ShipmentEvent[]) ?? []);
      setLoading(false);
    };

    void load();

    const shipmentChannel = supabase
      .channel(`public:shipments:${shipmentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shipments', filter: `id=eq.${shipmentId}` },
        (payload: RealtimePostgresChangesPayload<Shipment>) => {
          const updated = payload.new as Shipment;
          setShipment(updated);
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`public:shipment_events:${shipmentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shipment_events', filter: `shipment_id=eq.${shipmentId}` },
        (payload: RealtimePostgresChangesPayload<ShipmentEvent>) => {
          const next = payload.new as ShipmentEvent;
          setEvents((prev) => [next, ...prev]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(shipmentChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [shipmentId, canUpdateShipment]);

  const updateAssignment = async () => {
    if (!shipmentId) return;
    if (!shipment) return;
    if (!user) return;

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

      if (json.shipment) setShipment(json.shipment);
      toast.success('Assignment updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment';
      toast.error(message);
    } finally {
      setAssignmentSaving(false);
    }
  };

  const updateStatus = async () => {
    if (!shipmentId) return;
    if (!shipment) return;
    if (!user) return;

    setStatusSaving(true);
    try {
      const res = await apiFetch(`/api/shipments/${encodeURIComponent(shipmentId)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = (await res.json()) as { shipment?: Shipment; error?: string };

      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      if (json.shipment) setShipment(json.shipment);
      toast.success('Status updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-slate-400">Shipment details and event timeline.</p>
        </div>
        <button
          type="button"
          className="bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded font-semibold"
          onClick={() => router.push('/dashboard/shipments')}
        >
          Back
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-400">Loading…</p>
      ) : !shipment ? (
        <p className="mt-6 text-slate-400">Not found.</p>
      ) : (
        <div className="mt-8 grid gap-6">
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
            <div className="mt-6 grid gap-4">
              <div>
                <div className="text-slate-400 text-sm">Origin</div>
                <div className="text-slate-200">{shipment.origin_address}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">Destination</div>
                <div className="text-slate-200">{shipment.destination_address}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold">Update status</h2>
            {!user ? (
              <p className="mt-3 text-slate-400">Sign in to update shipments.</p>
            ) : !canUpdateShipment ? (
              <p className="mt-3 text-slate-400">Only dispatchers and admins can update shipment status.</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ShipmentStatus)}
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
                  <button
                    type="button"
                    disabled={statusSaving || nextStatus === shipment.status}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 transition px-4 py-2 rounded font-semibold"
                    onClick={() => void updateStatus()}
                  >
                    {statusSaving ? 'Updating…' : 'Update status'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold">Assign driver / vehicle</h2>
            {!user ? (
              <p className="mt-3 text-slate-400">Sign in to assign shipments.</p>
            ) : !canUpdateShipment ? (
              <p className="mt-3 text-slate-400">Only dispatchers and admins can assign shipments.</p>
            ) : (
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
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold">Add event</h2>
            {!user ? (
              <p className="mt-3 text-slate-400">Sign in to add events.</p>
            ) : !canAddEvent ? (
              <p className="mt-3 text-slate-400">You don’t have permission to add events.</p>
            ) : (
              <form
                className="mt-4 grid gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!shipmentId) return;
                  if (!user) return;

                  const trimmedNotes = eventForm.notes.trim();
                  const trimmedType = eventForm.event_type.trim();
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
                        notes: trimmedNotes ? trimmedNotes : null,
                      }),
                    });

                    const json = (await res.json()) as { ok?: boolean; error?: string };

                    if (!res.ok) throw new Error(json.error || 'Failed to add event');

                    toast.success('Event added');
                    setEventForm({ event_type: 'status_update', notes: '' });
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Failed to add event';
                    toast.error(message);
                  } finally {
                    setEventSaving(false);
                  }
                }}
              >
                <div>
                  <label className="block text-slate-300 font-semibold mb-2" htmlFor="event_type">
                    Event type
                  </label>
                  <input
                    id="event_type"
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm((f) => ({ ...f, event_type: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                    placeholder="e.g. picked_up, in_transit"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-2" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={eventForm.notes}
                    onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
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
            )}
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
                    {ev.notes ? <div className="mt-2 text-slate-300">{ev.notes}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

