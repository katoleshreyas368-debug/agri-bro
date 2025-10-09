import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  testDir: './tests',
  use: {
    headless: true,
    actionTimeout: 10_000,
    baseURL: 'http://localhost:5173'
  },
  webServer: {
    command: 'npm run dev',
    cwd: process.cwd(),
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      // ensure frontend dev server uses the backend URL during tests
      VITE_API_URL: process.env.VITE_API_URL || 'http://127.0.0.1:5001'
    }
  }
});
