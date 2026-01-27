import { expect, test } from '@playwright/test';

test('dashboard redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard\/auth\/login/);
});

test('admin redirects unauthenticated users to admin login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});
