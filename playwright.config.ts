import { defineConfig } from '@playwright/test';

function loadEnvFile(filePath: string) {
  try {
    // Lazy require to keep config portable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

// Ensure env vars exist for globalSetup when running via Playwright.
loadEnvFile('.env');
loadEnvFile('.env.local');

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  retries: 1,
  globalSetup: './tests/global-setup',
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
