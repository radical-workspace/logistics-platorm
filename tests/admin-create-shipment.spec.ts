import { test, expect } from '@playwright/test';
import { getE2ESeed } from './helpers/e2e-seed';

test('Admin can create shipment', async ({ page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Missing SUPABASE_SERVICE_ROLE_KEY for E2E seeding');
  const seed = getE2ESeed();

  await page.goto('/login');

  await page.fill('input[type="email"]', seed.adminEmail);
  await page.fill('input[type="password"]', seed.adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard(\/|$)/, { timeout: 15_000 });
  // Ensure admin role has hydrated (admin-only nav link appears)
  await expect(page.getByRole('link', { name: /^admin$/i })).toBeVisible({ timeout: 20_000 });

  await page.goto('/dashboard/shipments/new');

  await page.getByLabel('Customer ID', { exact: false }).fill(seed.customerId);
  await page.getByLabel('Reference number', { exact: false }).fill(`TEST-${Date.now()}`);
  await page.getByLabel('Origin address', { exact: false }).fill('Kabul');
  await page.getByLabel('Destination address', { exact: false }).fill('Lagos');

  await page.getByRole('button', { name: /create shipment/i }).click();

  await expect(page.locator('text=Shipment created')).toBeVisible();
});
