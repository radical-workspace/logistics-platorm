import { test, expect } from '@playwright/test';
import { getE2ESeed } from './helpers/e2e-seed';

test('Customer delivery confirmation request -> admin approves -> customer sees Delivered', async ({ page, browser }) => {
  test.setTimeout(180_000);
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Missing SUPABASE_SERVICE_ROLE_KEY for E2E seeding');
  const seed = getE2ESeed();

  const customerEmail = (process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@afghco.test').trim();
  const customerPassword = process.env.E2E_CUSTOMER_PASSWORD || 'CustomerPassword123!';

  // ---------------------------
  // 1) Customer submits delivery confirmation request
  // ---------------------------
  await page.goto('/login');

  await page.fill('input[type="email"]', customerEmail);
  await page.fill('input[type="password"]', customerPassword);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((c) => c.name.includes('sb-') && c.name.includes('access-token'));
    }, { timeout: 30_000, intervals: [500, 1000, 2000] })
    .toBeTruthy();

  const confirmRes = await page.request.post(`/api/shipments/${seed.shipmentId}/delivery-confirmation`, {
    data: {
      notes: 'Package received by customer (E2E)',
      delivered_at: new Date().toISOString(),
    },
    timeout: 60_000,
  });

  const confirmText = await confirmRes.text();
  expect(confirmRes.ok(), `delivery-confirmation failed: ${confirmRes.status()} ${confirmText}`).toBeTruthy();

  const confirmJson = JSON.parse(confirmText) as { ok?: boolean; request?: { id?: string } };
  expect(confirmJson.ok).toBeTruthy();
  const approvalRequestId = confirmJson.request?.id;
  expect(approvalRequestId, `Missing request.id from response: ${confirmText}`).toBeTruthy();

  // ---------------------------
  // 2) Admin approves request
  // ---------------------------
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await adminPage.goto('/login');
  await adminPage.fill('input[type="email"]', seed.adminEmail);
  await adminPage.fill('input[type="password"]', seed.adminPassword);
  await adminPage.getByRole('button', { name: /sign in/i }).click();

  await expect
    .poll(async () => {
      const cookies = await adminContext.cookies();
      return cookies.some((c) => c.name.includes('sb-') && c.name.includes('access-token'));
    }, { timeout: 30_000, intervals: [500, 1000, 2000] })
    .toBeTruthy();

  const approveRes = await adminContext.request.patch(`/api/admin/approval-requests/${approvalRequestId}`, {
    data: { action: 'approve', reviewer_notes: 'Approved (E2E)' },
    timeout: 60_000,
  });

  const approveText = await approveRes.text();
  expect(approveRes.ok(), `approve failed: ${approveRes.status()} ${approveText}`).toBeTruthy();

  // ---------------------------
  // 3) Assert DB truth via /api/track (poll)
  // ---------------------------
  await expect
    .poll(
      async () => {
        const res = await adminContext.request.get(`/api/track?ref=${encodeURIComponent(seed.shipmentRef)}`);
        if (!res.ok()) return false;
        const json = (await res.json()) as { data?: { status?: string } };
        return String(json?.data?.status ?? '').toLowerCase() === 'delivered';
      },
      { timeout: 60_000, intervals: [1000, 2000, 5000] }
    )
    .toBeTruthy();

  // ---------------------------
  // 4) Customer sees Delivered on tracking page
  // ---------------------------
  await page.goto(`/tracking?ref=${encodeURIComponent(seed.shipmentRef)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await expect(page.getByText(/shipment tracking/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^delivered$/i)).toBeVisible({ timeout: 30_000 });

  await adminContext.close();
});
