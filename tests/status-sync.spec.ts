import { test, expect } from '@playwright/test';
import { getE2ESeed } from './helpers/e2e-seed';

test('Shipment status update reflects to customer', async ({ page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Missing SUPABASE_SERVICE_ROLE_KEY for E2E seeding');
  const seed = getE2ESeed();

  await page.goto('/login');
  await page.fill('input[type="email"]', seed.adminEmail);
  await page.fill('input[type="password"]', seed.adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard(\/|$)/, { timeout: 15_000 });
  // Ensure admin role has hydrated (admin-only nav link appears)
  await expect(page.getByRole('link', { name: /^admin$/i })).toBeVisible({ timeout: 20_000 });

  await page.goto(`/dashboard/shipments/${seed.shipmentId}`);
  await page.getByLabel('Status', { exact: false }).selectOption('delivered');
  await page.getByRole('button', { name: /^update status$/i }).click();

  await page.goto(`/tracking?ref=${encodeURIComponent(seed.shipmentRef)}`);
  await expect(page.locator('text=Shipment Tracking')).toBeVisible();
  await expect(page.locator('text=delivered')).toBeVisible();
});
