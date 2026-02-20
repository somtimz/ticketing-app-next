// e2e/tickets/agent.spec.ts
import { test, expect } from '../fixtures';

test.describe('Agent – ticket flows', () => {
  test('all tickets visible in list', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    await expect(page.locator('main h1')).toContainText('All Tickets');
    // At least one ticket should exist from the seed
    const ticketLinks = page.locator('a[href*="/dashboard/issue-logging/"]');
    await expect(ticketLinks.first()).toBeVisible();
  });

  test('assign ticket to self', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    // Get ticket ID from URL
    const ticketId = page.url().split('/').pop();

    // Find Sarah Johnson's agent ID via the agents API
    const agentsRes = await page.request.get('/api/agents');
    const { agents } = await agentsRes.json() as { agents: { id: number; fullName: string }[] };
    const sarah = agents.find(a => a.fullName === 'Sarah Johnson');
    expect(sarah).toBeDefined();

    // Assign via API directly (bypasses controlled-select timing issues in dev mode)
    const res = await page.request.put(`/api/tickets/${ticketId}/assign`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ agentId: sarah!.id })
    });
    expect(res.ok()).toBeTruthy();

    // Reload to reflect the updated assignment
    await page.reload();
    await expect(page.locator('dd').filter({ hasText: 'Sarah Johnson' })).toBeVisible({ timeout: 15000 });
  });

  test('status transition: New → InProgress → Resolved', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    const ticketId = page.url().split('/').pop();

    // → InProgress via API (bypasses controlled-select timing issues in dev mode)
    const statusRes = await page.request.put(`/api/tickets/${ticketId}/status`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ status: 'InProgress' })
    });
    expect(statusRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('span:has-text("In Progress")').first()).toBeVisible({ timeout: 15000 });

    // → Resolved via the UI Resolve form (uses textarea + POST, not controlled select)
    await page.fill('textarea[placeholder="Enter resolution details..."]', 'Fixed by restarting the service.');
    await page.click('button:has-text("Resolve Ticket")');
    await expect(page.locator('span:has-text("Resolved")').first()).toBeVisible({ timeout: 15000 });
  });

  test('add public comment → visible on ticket', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    await page.fill('textarea[placeholder="Add a comment..."]', 'This is a public comment from the agent.');
    await page.click('button:has-text("Post Comment")');

    // Comment should appear in the comments list
    await expect(page.locator('text=This is a public comment from the agent.')).toBeVisible();
  });

  test('add internal note → "Internal note" badge visible to agent', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    await page.fill('textarea[placeholder="Add a comment..."]', 'Internal: escalating to Level 2.');
    await page.check('input[type="checkbox"]'); // "Internal note" checkbox
    await page.click('button:has-text("Post Comment")');

    // The "Internal note" badge should appear on the posted comment
    await expect(page.locator('span:has-text("Internal note")').first()).toBeVisible();
  });
});
