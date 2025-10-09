import { test, expect } from '@playwright/test';

const apiBase = process.env.VITE_API_URL || 'http://127.0.0.1:5001';

test('create crop via API, verify in UI, place bid via UI', async ({ page, request }) => {
  // setup: create crop via API
  const createResp = await request.post(`${apiBase}/crops`, {
    data: {
      name: 'ui-e2e-crop',
      quantity: 3,
      unit: 'kg',
      basePrice: 50,
      farmerId: 'ui-e2e-farmer',
      farmerName: 'UI E2E Farmer'
    }
  });
  expect(createResp.ok()).toBeTruthy();
  const created = await createResp.json();
  const cropName = created.name || 'ui-e2e-crop';

  // open frontend and wait for the crops network call
  await page.goto('/');
  await page.waitForResponse(resp => resp.url().includes('/crops') && resp.status() === 200, { timeout: 10000 });

  // now assert UI
  await expect(page.locator(`text=${cropName}`).first()).toBeVisible({ timeout: 10000 });

  // open details/card (best-effort selectors)
  const card = page.locator(`text=${cropName}`).first();
  if (await card.locator('button:has-text("View")').count()) {
    await card.locator('button:has-text("View")').click();
  } else if (await card.locator('button:has-text("Details")').count()) {
    await card.locator('button:has-text("Details")').click();
  } else {
    await card.click();
  }

  // place bid via UI: try common selectors then wait for update
  try {
    await page.fill('input[name="bidAmount"]', '120');
  } catch {
    try { await page.fill('input[placeholder="Enter bid"]', '120'); } catch { await page.fill('input[type="number"]', '120'); }
  }
  if (await page.locator('button:has-text("Place Bid")').count()) {
    await page.locator('button:has-text("Place Bid")').click();
  } else if (await page.locator('button:has-text("Submit")').count()) {
    await page.locator('button:has-text("Submit")').click();
  } else {
    await page.locator('form button').first().click();
  }

  // wait for network and assert bid visible
  await page.waitForResponse(resp => resp.url().includes('/crops') && resp.status() === 200, { timeout: 10000 });
  await expect(page.locator('text=120').first()).toBeVisible({ timeout: 10000 });
});