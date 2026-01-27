import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  email: string;
  role: "admin" | "dispatcher" | "driver" | "customer";
  company_id: string | null;
};

// supabase-js types have complex generics; keep this setup file resilient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = any;

type SeedOut = {
  adminEmail: string;
  adminPassword: string;
  adminId: string;
  customerId: string;
  companyId: string;
  shipmentId: string;
  shipmentRef: string;
};

const SEED_DIR = ".playwright";
const SEED_FILE = "e2e-seed.json";

function seedPath() {
  return path.join(process.cwd(), SEED_DIR, SEED_FILE);
}

function readSeed(): SeedOut | null {
  const p = seedPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SeedOut;
  } catch {
    return null;
  }
}

function writeSeed(seed: SeedOut) {
  const outDir = path.join(process.cwd(), SEED_DIR);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(seedPath(), JSON.stringify(seed, null, 2), "utf8");
}

async function findUserIdByEmail(supabaseAdmin: SupabaseAdminClient, email: string) {
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (u: { id?: string; email?: string | null }) =>
        u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match?.id) return match.id;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function getOrCreateUser(
  supabaseAdmin: SupabaseAdminClient,
  { email, password, displayName }: { email: string; password: string; displayName: string }
) {
  const existingId = await findUserIdByEmail(supabaseAdmin, email);
  if (existingId) return existingId;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error) throw error;
  if (!data.user?.id) throw new Error("Failed to create user");
  return data.user.id;
}

async function waitForProfile(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  attempts = 10
): Promise<ProfileRow> {
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,role,company_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as ProfileRow;

    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error("Profile row not created by trigger in time");
}

function makeShipmentRef() {
  const base = `E2E-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  return `${base}-${Math.floor(Math.random() * 100000)}`;
}

export default async function globalSetup() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "Playwright globalSetup: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; admin E2E tests will be skipped."
    );
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const adminEmail = process.env.E2E_ADMIN_EMAIL || "e2e-admin@afghco.test";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "AdminPassword123!";
  const customerEmail = process.env.E2E_CUSTOMER_EMAIL || "e2e-customer@afghco.test";
  const customerPassword = process.env.E2E_CUSTOMER_PASSWORD || "CustomerPassword123!";

  const adminId = await getOrCreateUser(supabaseAdmin, {
    email: adminEmail,
    password: adminPassword,
    displayName: "E2E Admin",
  });
  const customerId = await getOrCreateUser(supabaseAdmin, {
    email: customerEmail,
    password: customerPassword,
    displayName: "E2E Customer",
  });

  await waitForProfile(supabaseAdmin, adminId);
  await waitForProfile(supabaseAdmin, customerId);

  // Ensure roles
  await supabaseAdmin.from("profiles").update({ role: "admin" }).eq("id", adminId);
  await supabaseAdmin.from("profiles").update({ role: "customer" }).eq("id", customerId);

  // Ensure a company owned by admin
  const companyName = process.env.E2E_COMPANY_NAME || "E2E Logistics";
  const { data: existingCompany, error: companyFetchError } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("owner_id", adminId)
    .eq("name", companyName)
    .maybeSingle();

  if (companyFetchError) throw companyFetchError;

  let companyId: string;
  if (existingCompany?.id) {
    companyId = existingCompany.id as string;
  } else {
    const { data: companyInsert, error: companyInsertError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        slug: "e2e-logistics",
        owner_id: adminId,
        description: "Seed data for Playwright E2E",
      })
      .select("id")
      .single();

    if (companyInsertError) throw companyInsertError;
    companyId = companyInsert.id as string;
  }

  // Link both profiles to the company
  await supabaseAdmin.from("profiles").update({ company_id: companyId }).in("id", [adminId, customerId]);

  // ----------------------------
  // Shipment seeding (reusable)
  // ----------------------------
  const prev = readSeed();

  let shipmentId: string | null = prev?.shipmentId ?? null;
  let shipmentRef: string | null = prev?.shipmentRef ?? null;

  if (shipmentId) {
    const { data: existingShipment } = await supabaseAdmin
      .from("shipments")
      .select("id,reference_number,status")
      .eq("id", shipmentId)
      .maybeSingle();

    const existingStatus = String(existingShipment?.status ?? "").toLowerCase();

    // If previous shipment missing OR already delivered, force a new one
    if (!existingShipment || existingStatus === "delivered") {
      shipmentId = null;
      shipmentRef = null;
    } else {
      // Keep ref aligned with DB
      shipmentRef = existingShipment.reference_number as string;
    }
  }

  // Create a fresh shipment if needed
  if (!shipmentId || !shipmentRef) {
    const newRef = makeShipmentRef();

    const { data: shipmentInsert, error: shipmentInsertError } = await supabaseAdmin
      .from("shipments")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        reference_number: newRef,
        origin_address: "Kabul",
        destination_address: "Lagos",
        status: "in_transit", // IMPORTANT: allows delivery confirmation
        description: "Seed shipment for Playwright E2E",
      })
      .select("id,reference_number")
      .single();

    if (shipmentInsertError) throw shipmentInsertError;

    shipmentId = shipmentInsert.id as string;
    shipmentRef = shipmentInsert.reference_number as string;

    // Seed an event so tracking page has a "Last update" entry
    await supabaseAdmin.from("shipment_events").insert({
      shipment_id: shipmentId,
      event_type: "status_update",
      notes: "Seed event for Playwright E2E",
      created_by: adminId,
    });
  } else {
    // Ensure it starts in a confirmable state for tests
    await supabaseAdmin
      .from("shipments")
      .update({ status: "in_transit" })
      .eq("id", shipmentId);
  }

  // Clean old approvals for this shipment (prevents conflicts between runs)
  await supabaseAdmin.from("approval_requests").delete().eq("shipment_id", shipmentId);

  // Write seed file every run (authoritative)
  const seedOut: SeedOut = {
    adminEmail,
    adminPassword,
    adminId,
    customerId,
    companyId,
    shipmentId,
    shipmentRef,
  };

  writeSeed(seedOut);

  // Populate env vars expected by tests/helpers/e2e-seed.ts
  process.env.E2E_ADMIN_EMAIL = adminEmail;
  process.env.E2E_ADMIN_PASSWORD = adminPassword;
  process.env.E2E_CUSTOMER_ID = customerId;
  process.env.E2E_SHIPMENT_ID = shipmentId;
  process.env.E2E_TRACKING_REF = shipmentRef;
}
