"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { shipmentSchema } from "@/lib/shared/validators";
import { apiFetch } from "@/lib/client/api";

type FormState = {
  company_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  reference_number: string;
  origin_address: string;
  destination_address: string;
  origin_latitude: string;
  origin_longitude: string;
  destination_latitude: string;
  destination_longitude: string;
  weight_kg: string;
  description: string;
  estimated_delivery: string;
};

function isValidEmail(email: string) {
  const e = email.trim();
  // Simple + reliable for UI gate. Server remains source of truth.
  // Requires: something@something.something and no spaces.
  return e.length >= 6 && !/\s/.test(e) && /^[^@]+@[^@]+\.[^@]+$/.test(e);
}

export default function NewShipmentPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  const canCreate =
    !!user &&
    !!profile &&
    (profile.role === "admin" || profile.role === "dispatcher");
  const isAdmin = profile?.role === "admin";
  const isDispatcher = profile?.role === "dispatcher";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    company_id: profile?.company_id ?? "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    reference_number: "",
    origin_address: "",
    destination_address: "",
    origin_latitude: "",
    origin_longitude: "",
    destination_latitude: "",
    destination_longitude: "",
    weight_kg: "",
    description: "",
    estimated_delivery: "",
  });
  const [companies, setCompanies] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    setForm((prev) =>
      prev.company_id
        ? prev
        : { ...prev, company_id: profile.company_id ?? "" },
    );
  }, [profile?.company_id]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    const loadCompanies = async () => {
      try {
        const res = await apiFetch("/api/admin/companies", {
          method: "GET",
          headers: { "content-type": "application/json" },
        });
        const json = (await res.json()) as {
          companies?: Array<{ id: string; name: string }>;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Failed to load companies");
        if (!active) return;
        const list = json.companies ?? [];
        setCompanies(list);
        if (!form.company_id && list.length === 1) {
          setForm((prev) => ({ ...prev, company_id: list[0].id }));
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error(err);
      }
    };

    void loadCompanies();

    return () => {
      active = false;
    };
  }, [isAdmin, form.company_id]);

  const parsedWeight = useMemo(() => {
    const trimmed = form.weight_kg.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : undefined;
  }, [form.weight_kg]);

  const parseCoordinate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number(trimmed);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error("You do not have permission to create shipments");
      return;
    }

    const companyId = isDispatcher
      ? profile?.company_id?.trim() || ""
      : form.company_id.trim();
    if (!companyId) {
      toast.error(
        isAdmin
          ? "Select a company to continue"
          : "Missing company ID on your profile",
      );
      return;
    }

    // ✅ normalize inputs once
    const customer_email = form.customer_email.trim();
    const customer_name = form.customer_name.trim();
    const reference_number = form.reference_number.trim();
    const origin_address = form.origin_address.trim();
    const destination_address = form.destination_address.trim();
    const customer_phone = form.customer_phone.trim();
    const origin_latitude = parseCoordinate(form.origin_latitude);
    const origin_longitude = parseCoordinate(form.origin_longitude);
    const destination_latitude = parseCoordinate(form.destination_latitude);
    const destination_longitude = parseCoordinate(form.destination_longitude);

    // ✅ UI gate (simple, correct)
    if (!isValidEmail(customer_email)) {
      toast.error("Enter a valid customer email");
      return;
    }

    setSaving(true);
    try {
      const parsed = shipmentSchema.parse({
        origin_address,
        destination_address,
        weight_kg: parsedWeight ?? 1,
        description: form.description?.trim() || undefined,
        // keep as entered; schema decides if valid
        estimated_delivery: form.estimated_delivery || undefined,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
      });

      const estimatedDeliveryIso = parsed.estimated_delivery
        ? parsed.estimated_delivery.toISOString()
        : null;

      const res = await apiFetch("/api/dashboard/shipments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_name,
          customer_email,
          customer_phone: customer_phone || null,
          company_id: companyId,
          reference_number,
          origin_address,
          destination_address,
          origin_latitude,
          origin_longitude,
          destination_latitude,
          destination_longitude,
          weight_kg: parsedWeight ?? null,
          description: form.description?.trim() || null,
          estimated_delivery: estimatedDeliveryIso,
        }),
      });

      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id)
        throw new Error(json.error || "Failed to create shipment");

      toast.success("Shipment created");
      router.push(`/dashboard/shipments/${json.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create shipment";
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

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">Profile not loaded.</p>
      </main>
    );
  }

  if (!canCreate) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">
          Only dispatchers and admins can create shipments.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-black">New shipment</h1>
        <p className="mt-2 text-slate-400">
          Create a shipment record for tracking and dispatch.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="company_id"
            >
              Company ID
            </label>
            {isAdmin ? (
              <select
                id="company_id"
                name="company_id"
                value={form.company_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company_id: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                required
              >
                <option value="" disabled>
                  Select company
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="company_id"
                name="company_id"
                aria-label="Company ID"
                value={form.company_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company_id: e.target.value }))
                }
                readOnly
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                placeholder="UUID"
              />
            )}
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="customer_name"
            >
              Customer name
            </label>
            <input
              id="customer_name"
              value={form.customer_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer_name: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="customer_email"
            >
              Customer email
            </label>
            <input
              id="customer_email"
              name="customer_email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.customer_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer_email: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="customer_phone"
            >
              Customer phone
            </label>
            <input
              id="customer_phone"
              value={form.customer_phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer_phone: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="Optional"
              inputMode="tel"
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="reference_number"
            >
              Reference number
            </label>
            <input
              id="reference_number"
              name="reference_number"
              value={form.reference_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference_number: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              placeholder="e.g. AFG-2026-0001"
              required
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="origin_address"
            >
              Origin address
            </label>
            <input
              id="origin_address"
              value={form.origin_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, origin_address: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-slate-300 font-semibold mb-2"
                htmlFor="origin_latitude"
              >
                Origin latitude
              </label>
              <input
                id="origin_latitude"
                value={form.origin_latitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origin_latitude: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                inputMode="decimal"
                placeholder="e.g. 40.7128"
              />
            </div>
            <div>
              <label
                className="block text-slate-300 font-semibold mb-2"
                htmlFor="origin_longitude"
              >
                Origin longitude
              </label>
              <input
                id="origin_longitude"
                value={form.origin_longitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origin_longitude: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                inputMode="decimal"
                placeholder="e.g. -74.0060"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="destination_address"
            >
              Destination address
            </label>
            <input
              id="destination_address"
              value={form.destination_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, destination_address: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-slate-300 font-semibold mb-2"
                htmlFor="destination_latitude"
              >
                Destination latitude
              </label>
              <input
                id="destination_latitude"
                value={form.destination_latitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination_latitude: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                inputMode="decimal"
                placeholder="e.g. 34.0522"
              />
            </div>
            <div>
              <label
                className="block text-slate-300 font-semibold mb-2"
                htmlFor="destination_longitude"
              >
                Destination longitude
              </label>
              <input
                id="destination_longitude"
                value={form.destination_longitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination_longitude: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                inputMode="decimal"
                placeholder="e.g. -118.2437"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="weight_kg"
            >
              Weight (kg)
            </label>
            <input
              id="weight_kg"
              value={form.weight_kg}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight_kg: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
              inputMode="decimal"
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="estimated_delivery"
            >
              Estimated delivery
            </label>
            <input
              id="estimated_delivery"
              type="datetime-local"
              value={form.estimated_delivery}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimated_delivery: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
            />
          </div>

          <div>
            <label
              className="block text-slate-300 font-semibold mb-2"
              htmlFor="description"
            >
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
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
              {saving ? "Creating…" : "Create shipment"}
            </button>
            <button
              type="button"
              className="bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded font-semibold"
              onClick={() => router.push("/dashboard/shipments")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
