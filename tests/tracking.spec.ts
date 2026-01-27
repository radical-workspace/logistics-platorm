import { test, expect } from "@playwright/test";
import { getE2ESeed } from "./helpers/e2e-seed";

test("Customer can track shipment", async ({ page }) => {
  test.setTimeout(60_000);

  const hasSeed = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reference = hasSeed
    ? getE2ESeed().shipmentRef
    : (process.env.E2E_TRACKING_REF || "TEST123456").trim();

  // Go directly to tracking page (stable; not dependent on homepage button navigation)
  await page.goto(`/tracking?ref=${encodeURIComponent(reference)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(
    page.getByRole("heading", { name: /shipment tracking/i }),
  ).toBeVisible({
    timeout: 20_000,
  });

  if (hasSeed || process.env.E2E_TRACKING_REF) {
    await expect(page.getByText("Status", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  } else {
    await expect(
      page.locator("text=No shipment found for reference:"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`text=${reference}`)).toBeVisible({
      timeout: 20_000,
    });
  }
});
