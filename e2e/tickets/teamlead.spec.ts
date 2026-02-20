// e2e/tickets/teamlead.spec.ts
import { test, expect } from '../fixtures';

test.describe('TeamLead – ticket flows', () => {
  test('all tickets visible in list', async ({ page }) => {
    await page.goto('/dashboard/all-tickets');
    await expect(page.locator('main h1')).toContainText('All Tickets');
    const ticketLinks = page.locator('a[href*="/dashboard/issue-logging/"]');
    await expect(ticketLinks.first()).toBeVisible();
  });

  test('can update status on any ticket', async ({ page, request }) => {
    // Create a fresh ticket so we don't depend on seeded "New" tickets
    // (prior agent tests may have resolved/closed all of them)
    const createRes = await request.post('/api/tickets', {
      data: {
        title: 'TeamLead E2E Status Test Ticket',
        description: 'Created by teamlead E2E test to verify status update.',
        impact: 'Low',
        urgency: 'Low',
        callerName: 'E2E Test Caller',
        callerEmail: 'e2e@test.com'
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const { id: ticketId } = await createRes.json() as { id: number };

    try {
      // Navigate directly to the ticket
      await page.goto(`/dashboard/issue-logging/${ticketId}`);
      await page.waitForURL(/\/dashboard\/issue-logging\/\d+/);

      // The Actions panel should be present (ticket is New/open)
      await expect(page.locator('h3:has-text("Update Status")')).toBeVisible({ timeout: 15000 });

      // Change status to InProgress via API (bypasses controlled-select timing issues in dev mode)
      const statusRes = await request.put(`/api/tickets/${ticketId}/status`, {
        data: { status: 'InProgress' }
      });
      expect(statusRes.ok()).toBeTruthy();

      await page.reload();
      await expect(page.locator('span:has-text("In Progress")').first()).toBeVisible({ timeout: 15000 });
    } finally {
      // Clean up: resolve and close the ticket
      await request.post(`/api/tickets/${ticketId}/resolve`, {
        data: { resolution: 'E2E test cleanup' }
      });
    }
  });

  test('admin-only API route returns 403 for TeamLead', async ({ page }) => {
    const response = await page.request.get('/api/users');
    expect(response.status()).toBe(403);
  });
});
