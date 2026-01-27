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

  const cookies = await page.context().cookies();
  const accessToken =
    cookies.find((cookie) => cookie.name === 'sb-access-token')?.value ??
    cookies.find((cookie) => cookie.name.endsWith('-access-token'))?.value;
  expect(accessToken, 'Missing access token cookie').toBeTruthy();

  const overviewRes = await page.request.get('/api/dashboard/overview', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const overviewText = await overviewRes.text();
  expect(overviewRes.ok(), `overview failed: ${overviewRes.status()} ${overviewText}`).toBeTruthy();
});
