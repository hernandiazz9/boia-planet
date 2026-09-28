import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas e2e contra el build de producción (`next build` + `next start`),
 * en Chromium, con un proyecto móvil (360×640, táctil) y uno de escritorio.
 * Uso: `pnpm e2e` desde la raíz. La primera vez hace falta el navegador:
 * `pnpm --filter @boia/web exec playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3107);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './node_modules/.playwright-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 360, height: 640 },
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `pnpm run build && pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
