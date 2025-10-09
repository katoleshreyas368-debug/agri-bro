import { test } from '@playwright/test';

const apiBase = process.env.VITE_API_URL || 'http://127.0.0.1:5001';

test('debug: create crop, capture /crops response and dump page HTML', async ({ page, request }) => {
  // create crop via backend API
  const createResp = await request.post(`${apiBase}/crops`, {
    data: { name: 'ui-e2e-crop-debug', quantity: 1, unit: 'kg', basePrice: 1, farmerId: 'dbg', farmerName: 'DBG' }
  });
  console.log('create ok?', createResp.ok());
  const created = await createResp.json();
  console.log('created id:', created.id);

  // intercept /crops response
  let cropsBody = null;
  page.on('response', async resp => {
    try {
      if (resp.url().includes('/crops') && resp.status() === 200) {
        cropsBody = await resp.text();
        console.log('=== /crops response ===\n', cropsBody.slice(0, 2000));
      }
    } catch (e) { console.error(e); }
  });

  // open UI and wait for /crops to be fetched
  await page.goto('http://localhost:5173/');
  await page.waitForResponse(resp => resp.url().includes('/crops') && resp.status() === 200, { timeout: 15000 });

  // dump trimmed HTML so we can inspect what the crop markup looks like
  const html = await page.content();
  console.log('=== page HTML (first 2000 chars) ===\n', html.slice(0, 2000));
  // save full HTML to file (report artifact)
  const fs = require('fs');
  fs.writeFileSync('playwright-debug-page.html', html, 'utf8');

  // keep headed run visible if you use --headed
});