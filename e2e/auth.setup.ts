// e2e/auth.setup.ts
import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

const AUTH_DIR = path.join('e2e', '.auth');

const USERS = [
  { role: 'employee', email: 'employee1@company.com', password: 'employee123' },
  { role: 'agent',    email: 'agent1@company.com',    password: 'agent123' },
  { role: 'teamlead', email: 'teamlead1@company.com', password: 'teamlead123' },
  { role: 'admin',    email: 'admin@company.com',     password: 'admin123' },
] as const;

setup.setTimeout(120_000); // seed against remote DB can take ~60s

setup('seed database and authenticate all roles', async ({ page }) => {
  // 1. Seed deterministic test data
  console.log('Seeding database...');
  execSync('npm run db:seed', { stdio: 'inherit' });

  // 2. Log in as each role, save session, clear cookies before next
  for (const user of USERS) {
    // Clear any leftover session from a previous iteration
    await page.context().clearCookies();

    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button[type="submit"]');

    // Wait until the dashboard is reached — confirms login succeeded
    await page.waitForURL('/dashboard/issue-logging', { timeout: 15_000 });

    const stateFile = path.join(AUTH_DIR, `${user.role}.json`);
    await page.context().storageState({ path: stateFile });
    console.log(`  ✓ Saved session for ${user.role} → ${stateFile}`);
  }
});
