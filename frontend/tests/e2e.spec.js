import { test, expect } from '@playwright/test';

// Use the VITE_API_URL to ensure the frontend will call the backend
const base = process.env.VITE_API_URL || 'http://localhost:5001';

test('homepage loads and shows marketplace', async ({ page }) => {
  // open frontend app
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveTitle(/AGRIBro|Marketplace|Landing/i);

  // try to load crops via API directly to assert backend connectivity
  const resp = await page.request.get(base + '/crops');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(Array.isArray(body)).toBeTruthy();
});
