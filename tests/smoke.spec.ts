import { expect, test } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AFGHCO Logistics/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('health endpoint responds', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { ok: boolean };
  expect(json.ok).toBe(true);
});
