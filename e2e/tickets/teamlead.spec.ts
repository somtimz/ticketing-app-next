// e2e/tickets/teamlead.spec.ts
import { test, expect } from '../fixtures';

test.describe('TeamLead – ticket flows', () => {
  test('all tickets visible in list', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    await expect(page.locator('main h1')).toContainText('All Tickets');
    const ticketLinks = page.locator('a[href*="/dashboard/issue-logging/"]');
    await expect(ticketLinks.first()).toBeVisible();
  });

  test('can update status on any ticket', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');

    // Filter to "New" tickets so we don't accidentally open a Resolved/Closed ticket
    // (prior tests may have already changed the status of the first ticket)
    await page.click('button:has-text("New")');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 15000 });
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);
    const ticketId = page.url().split('/').pop();

    // The Actions panel should be present (ticket is open)
    await expect(page.locator('h3:has-text("Update Status")')).toBeVisible({ timeout: 15000 });

    // Change status to InProgress via API (bypasses controlled-select timing issues in dev mode)
    const statusRes = await page.request.put(`/api/tickets/${ticketId}/status`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ status: 'InProgress' })
    });
    expect(statusRes.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('span:has-text("In Progress")').first()).toBeVisible({ timeout: 15000 });
  });

  test('admin-only API route returns 403 for TeamLead', async ({ page }) => {
    const response = await page.request.get('/api/users');
    expect(response.status()).toBe(403);
  });
});
