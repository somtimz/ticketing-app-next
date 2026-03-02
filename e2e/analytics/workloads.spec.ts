// e2e/analytics/workloads.spec.ts
import { test, expect } from '../fixtures';

test.describe('Analytics – workloads (TeamLead role)', () => {
  test('workload dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(page.locator('main h1')).toContainText('Analytics', { timeout: 20000 });
  });

  test('agent stats are displayed', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Team Summary section is visible to TeamLead+
    await expect(page.locator('h2:has-text("Team Summary")')).toBeVisible();

    // Agent Workloads table heading
    await expect(page.locator('h3:has-text("Agent Workloads")')).toBeVisible();

    // Table should have at least one agent row from the seed (5 agents seeded)
    const agentRows = page.locator('table tbody tr');
    await expect(agentRows.first()).toBeVisible();
  });
});
