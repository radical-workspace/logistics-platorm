import fs from 'node:fs';
import path from 'node:path';

export type E2ESeed = {
  adminEmail: string;
  adminPassword: string;
  adminId: string;
  customerId: string;
  companyId: string;
  shipmentId: string;
  shipmentRef: string;
};

export function getE2ESeed(): E2ESeed {
  const seedPath = path.join(process.cwd(), '.playwright', 'e2e-seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(
      `Missing E2E seed file at ${seedPath}. Run Playwright with the repo's playwright.config.ts (it runs globalSetup).`
    );
  }

  const raw = fs.readFileSync(seedPath, 'utf8');
  return JSON.parse(raw) as E2ESeed;
}
