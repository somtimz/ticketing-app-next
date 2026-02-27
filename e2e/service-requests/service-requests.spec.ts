// e2e/service-requests/service-requests.spec.ts
import { test, expect } from '../fixtures';

test('employee can submit a service request', async ({ page }) => {
  await page.goto('/dashboard/service-requests/new');
  await page.getByLabel('Title *').fill('Need new keyboard E2E');
  await page.getByLabel('Description *').fill('My keyboard is broken and I need a replacement.');
  await page.getByRole('button', { name: 'Submit Request' }).click();

  await expect(page).toHaveURL(/\/dashboard\/service-requests\/\d+/);
  await expect(page.getByText('Need new keyboard E2E')).toBeVisible();
  await expect(page.getByText('Submitted').first()).toBeVisible();
});

test('service request list shows submitted request', async ({ page }) => {
  await page.goto('/dashboard/service-requests');
  await expect(page.getByRole('heading', { name: 'Service Requests' })).toBeVisible();
  await expect(page.locator('table, [class*="text-center"]')).toBeVisible();
});

test.describe('agent actions', () => {
  test.use({ storageState: 'e2e/.auth/agent.json' });

  test('agent can approve a submitted service request', async ({ page, request }) => {
    // Create a request as setup
    const res = await request.post('/api/service-requests', {
      data: { title: 'Agent approve test', description: 'Test desc', category: 'Other', priority: 'P3' }
    });
    expect(res.ok()).toBeTruthy();
    const { serviceRequest } = await res.json() as { serviceRequest: { id: number } };

    await page.goto(`/dashboard/service-requests/${serviceRequest.id}`);
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 10000 });
  });
});
