import { test, expect } from '@playwright/test';
import { getE2ESeed } from './helpers/e2e-seed';

test('Admin can login', async ({ page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Missing SUPABASE_SERVICE_ROLE_KEY for E2E seeding');
  const seed = getE2ESeed();

  await page.goto('/login');

  await page.fill('input[type="email"]', seed.adminEmail);
  await page.fill('input[type="password"]', seed.adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard(\/|$)/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});
