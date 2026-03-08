// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const authDir = 'e2e/.auth';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // ── Setup: seed DB + authenticate all roles ──────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // ── Unauthenticated: login flow tests ────────────────────
    {
      name: 'unauthenticated',
      testMatch: /e2e\/auth\/login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Employee ─────────────────────────────────────────────
    {
      name: 'employee',
      testMatch: [
        /e2e\/tickets\/employee\.spec\.ts/,
        /e2e\/kb\/browse\.spec\.ts/,
        /e2e\/service-requests\/service-requests\.spec\.ts/,
      ],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${authDir}/employee.json`,
      },
    },

    // ── Agent ────────────────────────────────────────────────
    {
      name: 'agent',
      testMatch: [
        /e2e\/tickets\/agent\.spec\.ts/,
        /e2e\/kb\/manage\.spec\.ts/,
        /e2e\/assets\/assets\.spec\.ts/,
      ],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${authDir}/agent.json`,
      },
    },

    // ── TeamLead ─────────────────────────────────────────────
    {
      name: 'teamlead',
      testMatch: [
        /e2e\/tickets\/teamlead\.spec\.ts/,
        /e2e\/analytics\/workloads\.spec\.ts/,
      ],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${authDir}/teamlead.json`,
      },
    },

    // ── Admin ────────────────────────────────────────────────
    {
      name: 'admin',
      testMatch: /e2e\/admin\/users\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${authDir}/admin.json`,
      },
    },

    // ── Portal ───────────────────────────────────────────────
    {
      name: 'portal',
      testMatch: /e2e\/portal\/portal\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(process.env.BASE_URL ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
