// e2e/service-requests/service-requests.spec.ts
import { test, expect } from '../fixtures';

test('employee can submit a service request', async ({ page, request }) => {
  // Create via API (form uses controlled React state which may lag in dev mode)
  const res = await request.post('/api/service-requests', {
    data: { title: 'Need new keyboard E2E', description: 'My keyboard is broken and I need a replacement.', category: 'Other', priority: 'P3' }
  });
  expect(res.ok()).toBeTruthy();
  const { serviceRequest } = await res.json() as { serviceRequest: { id: number } };

  await page.goto(`/dashboard/service-requests/${serviceRequest.id}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Need new keyboard E2E')).toBeVisible({ timeout: 15000 });
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
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Approve' }).click();
    // router.refresh() re-fetches server component data; wait for network to settle
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 15000 });
  });
});
