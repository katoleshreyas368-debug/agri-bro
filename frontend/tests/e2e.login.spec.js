import { test, expect } from '@playwright/test';

test('UI smoke: login UI is visible', async ({ page }) => {
  await page.goto('/');
  // Adjust locator if your app's login button text differs
  const loginLocator = page.locator('text=Login').first();
  await expect(loginLocator).toBeVisible({ timeout: 5000 });
});