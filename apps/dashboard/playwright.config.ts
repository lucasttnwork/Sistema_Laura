import { defineConfig, devices } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3001'
const shouldSkipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files sequentially to avoid shared-state race conditions */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run a single worker to simplify local dev server coordination */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'html',
  expect: {
    timeout: process.env.CI ? 20000 : 15000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    actionTimeout: 15000,
    navigationTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: shouldSkipWebServer
    ? undefined
    : {
        command: 'pnpm run dev -- --host 127.0.0.1 --port 3001',
        port: 3001,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        cwd: resolve(__dirname),
      },
})
