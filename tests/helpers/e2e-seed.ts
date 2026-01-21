export function getE2ESeed() {
  // Prefer env vars first (CI-friendly). If missing, load from the seed file.
  const haveAllEnv =
    !!process.env.E2E_ADMIN_EMAIL &&
    !!process.env.E2E_ADMIN_PASSWORD &&
    !!process.env.E2E_CUSTOMER_ID &&
    !!process.env.E2E_SHIPMENT_ID &&
    !!process.env.E2E_TRACKING_REF;

  if (!haveAllEnv) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as typeof import('node:fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('node:path') as typeof import('node:path');
      const file = path.join(process.cwd(), '.playwright', 'e2e-seed.json');
      if (fs.existsSync(file)) {
        const json = JSON.parse(fs.readFileSync(file, 'utf8')) as {
          adminEmail: string;
          adminPassword: string;
          customerId: string;
          shipmentId: string;
          shipmentRef: string;
        };
        process.env.E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? json.adminEmail;
        process.env.E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? json.adminPassword;
        process.env.E2E_CUSTOMER_ID = process.env.E2E_CUSTOMER_ID ?? json.customerId;
        process.env.E2E_SHIPMENT_ID = process.env.E2E_SHIPMENT_ID ?? json.shipmentId;
        process.env.E2E_TRACKING_REF = process.env.E2E_TRACKING_REF ?? json.shipmentRef;
      }
    } catch {
      // ignore; tests will fail with clearer error below if still missing
    }
  }

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  const customerId = process.env.E2E_CUSTOMER_ID;
  const shipmentId = process.env.E2E_SHIPMENT_ID;
  const shipmentRef = process.env.E2E_TRACKING_REF;

  if (!adminEmail || !adminPassword || !customerId || !shipmentId || !shipmentRef) {
    throw new Error(
      'E2E seed variables are missing. Ensure tests/global-setup.ts ran and .playwright/e2e-seed.json exists.'
    );
  }

  return { adminEmail, adminPassword, customerId, shipmentId, shipmentRef };
}
