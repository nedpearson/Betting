import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 8000,
  },
  fullyParallel: true,
  retries: 1,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://betting-bridgebox.vercel.app',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Safari (iPhone 14)',
      use: { 
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'Mobile Chrome (Pixel 7)',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
