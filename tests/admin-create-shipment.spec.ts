import { test, expect } from "@playwright/test";

test("Admin can create shipment", async ({ page }) => {
  await page.goto("/dashboard/shipments/new");

  await expect(page).toHaveURL("/dashboard/shipments/new");

  // company_id is readonly, so just assert
  await expect(page.getByLabel("Customer ID", { exact: false })).toHaveValue(/.+/);

  const reference = `REF-${Date.now()}`;
  await page.getByLabel("Reference number", { exact: false }).fill(reference);

  await page.getByRole("button", { name: /create/i }).click();

  await expect(page.getByText(/success|created/i)).toBeVisible();
});
