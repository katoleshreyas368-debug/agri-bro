import { test, expect } from '@playwright/test';

const baseApi = process.env.VITE_API_URL || 'http://127.0.0.1:5001';

test.describe('E2E: create crop + place bid + UI verification', () => {
  test('create crop via API, verify in UI, place bid via API and verify UI shows bid', async ({ page, request }) => {
    // create crop via API
    const createResp = await request.post(`${baseApi}/crops`, {
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

    // open frontend and wait for the frontend to fetch crops
    await page.goto('/');
    await page.waitForResponse(resp => resp.url().includes('/crops') && resp.status() === 200, { timeout: 10000 });

    // verify crop appears
    await expect(page.locator(`text=${cropName}`).first()).toBeVisible({ timeout: 10000 });

    // place bid via API
    const bidResp = await request.post(`${baseApi}/crops/${created.id}/bids`, {
      data: { buyerId: 'ui-e2e-buyer', buyerName: 'UI E2E Buyer', amount: 120 }
    });
    expect(bidResp.ok()).toBeTruthy();

    // reload and verify bid visible
    await page.reload();
    await page.waitForResponse(resp => resp.url().includes('/crops') && resp.status() === 200, { timeout: 10000 });
    await expect(page.locator('text=120').first()).toBeVisible({ timeout: 10000 });
  });
});