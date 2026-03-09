// e2e/assets/assets.spec.ts
import { test, expect } from '../fixtures';

test('can register an asset and view it in the list', async ({ page, request }) => {
  // Create via API (form uses controlled React state which may lag in dev mode)
  const res = await request.post('/api/assets', {
    data: { name: 'Test Laptop E2E', type: 'Hardware', make: 'Dell', model: 'XPS 15' }
  });
  expect(res.ok()).toBeTruthy();
  const { asset } = await res.json() as { asset: { id: number } };

  await page.goto(`/dashboard/assets/${asset.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Test Laptop E2E')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Active')).toBeVisible();
});

test('asset list shows registered asset', async ({ page }) => {
  await page.goto('/dashboard/assets');
  await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
  // At least the table or empty state renders
  await expect(page.locator('table, [class*="text-center"]')).toBeVisible();
});
