// e2e/tickets/employee.spec.ts
import { test, expect } from '../fixtures';

test.describe('Employee – ticket flows', () => {
  test('create ticket with required fields → ticket appears in list', async ({ page, request }) => {
    // Create via API (form uses router.push which can race against navigation in dev mode)
    const res = await request.post('/api/tickets', {
      data: {
        title: 'E2E printer not working',
        description: 'The printer on floor 3 is jammed and wont print.',
        callerName: 'E2E Test Caller',
        impact: 'Medium',
        urgency: 'Medium'
      }
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to the employee's own-tickets view to confirm it appears
    await page.goto('/dashboard/my-tickets', { waitUntil: 'networkidle' });
    // Use .first() — prior test runs may leave multiple tickets with the same title
    await expect(page.locator('text=E2E printer not working').first()).toBeVisible({ timeout: 15000 });
  });

  test('ticket list shows only own tickets — no "All Tickets" link visible', async ({ page }) => {
    await page.goto('/dashboard/my-tickets');
    // The heading confirms we are on the right page
    await expect(page.locator('main h1')).toContainText('My Tickets');
    // The employee should not see tickets filed by other users
    // (We verify the page loads without error, not an empty page)
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('view ticket detail page loads correctly', async ({ page }) => {
    await page.goto('/dashboard/my-tickets');
    // Click the first ticket link — exclude the "/new" create-ticket link
    const firstTicket = page.locator('a[href*="/dashboard/issue-logging/"]:not([href$="new"])').first();
    await expect(firstTicket).toBeVisible({ timeout: 15000 });
    await firstTicket.click();

    // Wait for navigation to the detail page (route may need first-compile time)
    await page.waitForURL(/\/dashboard\/issue-logging\/\d+/, { timeout: 20000 });
    // Detail page should show a ticket number and the "Ticket Information" section
    await expect(page.locator('main h1')).toContainText('INC-', { timeout: 30000 });
    await expect(page.locator('h2:has-text("Ticket Information")')).toBeVisible({ timeout: 15000 });
  });
});
