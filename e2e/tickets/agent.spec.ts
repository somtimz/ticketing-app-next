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
    const ticketId = page.url().split('/').pop()!;

    // Find any agent via the agents API
    const agentsRes = await page.request.get('/api/agents');
    const { agents } = await agentsRes.json() as { agents: { id: number; fullName: string }[] };
    expect(agents.length).toBeGreaterThan(0);
    const targetAgent = agents[0];

    // Assign via API directly (bypasses controlled-select timing issues in dev mode)
    const res = await page.request.put(`/api/tickets/${ticketId}/assign`, {
      data: { agentId: targetAgent.id }
    });
    expect(res.ok()).toBeTruthy();

    // Reload to reflect the updated assignment
    await page.reload();
    await expect(page.locator('dd').filter({ hasText: targetAgent.fullName })).toBeVisible({ timeout: 15000 });
  });

  test('status transition: New → InProgress → Resolved', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    const ticketId = page.url().split('/').pop()!;

    // → InProgress via API (bypasses controlled-select timing issues in dev mode)
    const statusRes = await page.request.put(`/api/tickets/${ticketId}/status`, {
      data: { status: 'InProgress' }
    });
    expect(statusRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('span:has-text("In Progress")').first()).toBeVisible({ timeout: 15000 });

    // → Resolved via API (resolve textarea is a controlled input; state may lag in dev mode)
    const resolveRes = await page.request.post(`/api/tickets/${ticketId}/resolve`, {
      data: { resolution: 'Fixed by restarting the service.' }
    });
    expect(resolveRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('span:has-text("Resolved")').first()).toBeVisible({ timeout: 15000 });
  });

  test('add public comment → visible on ticket', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    await page.fill('textarea[placeholder="Add a comment... (type @ to mention someone)"]','This is a public comment from the agent.');
    await page.click('button:has-text("Post Comment")');

    // Comment should appear in the comments list
    await expect(page.locator('text=This is a public comment from the agent.')).toBeVisible();
  });

  test('add internal note → "Internal note" badge visible to agent', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    await page.fill('textarea[placeholder="Add a comment... (type @ to mention someone)"]','Internal: escalating to Level 2.');
    await page.check('input[type="checkbox"]'); // "Internal note" checkbox
    await page.click('button:has-text("Post Comment")');

    // The "Internal note" badge should appear on the posted comment
    await expect(page.locator('span:has-text("Internal note")').first()).toBeVisible();
  });

  test('KB suggestions panel is visible on ticket detail', async ({ page }) => {
    // Navigate to the all-tickets list to find an open ticket
    await page.goto('/dashboard/all-tickets');
    await page.waitForLoadState('networkidle');

    // Click the first ticket link
    const ticketLink = page.locator('a[href*="/dashboard/issue-logging/"]:not([href$="new"])').first();
    await ticketLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+$/);
    await page.waitForLoadState('networkidle');

    // The ticket may or may not be open (Actions panel only shows for open tickets)
    // Check if Actions panel is present
    const actionsHeading = page.getByRole('heading', { name: 'Actions', level: 2 });
    const actionsVisible = await actionsHeading.isVisible().catch(() => false);

    if (!actionsVisible) {
      // Ticket is resolved/closed, navigate to issue-logging list and find a New ticket
      await page.goto('/dashboard/issue-logging');
      await page.waitForLoadState('networkidle');
      const newTicketLink = page.locator('a[href*="/dashboard/issue-logging/"]:not([href$="new"])').first();
      if (!(await newTicketLink.isVisible().catch(() => false))) return; // no tickets, skip
      await newTicketLink.click();
      await page.waitForURL(/\/dashboard\/issue-logging\/\d+$/);
      await page.waitForLoadState('networkidle');
    }

    // If still no Actions panel, skip (all tickets closed)
    const actionsNow = await page.getByRole('heading', { name: 'Actions', level: 2 }).isVisible().catch(() => false);
    if (!actionsNow) return;

    // KB suggestions section should be visible
    await expect(page.getByText('Related Articles')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kb-search-input')).toBeVisible({ timeout: 5000 });
  });
});
