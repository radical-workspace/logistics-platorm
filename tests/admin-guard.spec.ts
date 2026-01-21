import { test, expect } from '@playwright/test';

test('Unauthenticated user cannot access admin', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/login/);
});
