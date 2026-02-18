// e2e/tickets/agent.spec.ts
import { test, expect } from '../fixtures';

test.describe('Agent – ticket flows', () => {
  test('all tickets visible in list', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    await expect(page.locator('h1')).toContainText('All Tickets');
    // At least one ticket should exist from the seed
    const ticketLinks = page.locator('a[href*="/dashboard/issue-logging/"]');
    await expect(ticketLinks.first()).toBeVisible();
  });

  test('assign ticket to self', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    // Click the first ticket that is unassigned (status "New")
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    // Select self (agent1) from the assign dropdown
    // agent1@company.com fullName is "Sarah Johnson"
    const assignSelect = page.locator('select').filter({ hasText: 'Select agent...' });
    await assignSelect.selectOption({ label: /Sarah Johnson/ });
    await page.click('button:has-text("Assign")');

    // After assign, the "Assigned Agent" section should update
    await expect(page.locator('dd').filter({ hasText: 'Sarah Johnson' })).toBeVisible();
  });

  test('status transition: New → InProgress → Resolved', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    const statusSelect = page.locator('select').filter({ hasText: 'New' }).first();

    // → InProgress
    await statusSelect.selectOption('InProgress');
    await page.click('button:has-text("Update")');
    await expect(page.locator('span:has-text("In Progress")')).toBeVisible();

    // → Resolved (uses Resolve form, not status dropdown)
    await page.fill('textarea[placeholder="Enter resolution details..."]', 'Fixed by restarting the service.');
    await page.click('button:has-text("Resolve Ticket")');
    await expect(page.locator('span:has-text("Resolved")')).toBeVisible();
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
    await expect(page.locator('span:has-text("Internal note")')).toBeVisible();
  });
});
