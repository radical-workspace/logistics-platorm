import { test, expect } from '@playwright/test';
import { getE2ESeed } from './helpers/e2e-seed';

test('Customer can track shipment', async ({ page }) => {
  test.setTimeout(60_000);
  const hasSeed = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reference = hasSeed ? getE2ESeed().shipmentRef : (process.env.E2E_TRACKING_REF || 'TEST123456').trim();

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Enter reference number').fill(reference);
  await page.getByRole('button', { name: /^track$/i }).click();
  await expect(page).toHaveURL(/\/tracking\?ref=/, { timeout: 20_000 });
  await expect(page.locator('text=Shipment Tracking')).toBeVisible();

  if (hasSeed || process.env.E2E_TRACKING_REF) {
    await expect(page.getByText('Status', { exact: true })).toBeVisible();
  } else {
    await expect(page.locator('text=No shipment found for reference:')).toBeVisible();
    await expect(page.locator(`text=${reference}`)).toBeVisible();
  }
});
