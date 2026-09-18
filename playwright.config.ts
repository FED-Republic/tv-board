import { defineConfig, devices } from '@playwright/test';

const PREVIEW_URL = 'http://localhost:4173';
const isCi = Boolean(process.env.CI);

/** Smoke suite on the production build: one phone and one desktop project, Chromium only. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? 'github' : 'list',
  use: { baseURL: PREVIEW_URL, trace: 'on-first-retry' },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: PREVIEW_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
