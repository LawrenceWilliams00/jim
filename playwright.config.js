import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'node tests/serve.mjs 4173', url: 'http://localhost:4173/', reuseExistingServer: true },
  projects: [
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'small-android', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } } },
  ],
});
