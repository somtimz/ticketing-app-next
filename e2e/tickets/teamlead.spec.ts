// e2e/tickets/teamlead.spec.ts
import { test, expect } from '../fixtures';

test.describe('TeamLead – ticket flows', () => {
  test('all tickets visible in list', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    await expect(page.locator('h1')).toContainText('All Tickets');
    const ticketLinks = page.locator('a[href*="/dashboard/issue-logging/"]');
    await expect(ticketLinks.first()).toBeVisible();
  });

  test('can update status on any ticket', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    const firstLink = page.locator('a[href*="/dashboard/issue-logging/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

    // The Actions panel should be present (ticket is open)
    const statusSelect = page.locator('h3:has-text("Update Status")');
    await expect(statusSelect).toBeVisible();

    // Change status to InProgress
    const select = page.locator('select').filter({ hasText: 'New' }).first();
    await select.selectOption('InProgress');
    await page.click('button:has-text("Update")');
    await expect(page.locator('span:has-text("In Progress")')).toBeVisible();
  });

  test('admin-only API route returns 403 for TeamLead', async ({ page }) => {
    const response = await page.request.get('/api/users');
    expect(response.status()).toBe(403);
  });
});
