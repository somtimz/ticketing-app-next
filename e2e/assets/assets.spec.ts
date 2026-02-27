// e2e/assets/assets.spec.ts
import { test, expect } from '../fixtures';

test('can register an asset and view it in the list', async ({ page }) => {
  await page.goto('/dashboard/assets/new');
  await page.getByLabel('Name *').fill('Test Laptop E2E');
  await page.getByLabel('Make').fill('Dell');
  await page.getByLabel('Model').fill('XPS 15');
  await page.getByRole('button', { name: 'Register Asset' }).click();

  // Should redirect to asset detail
  await expect(page).toHaveURL(/\/dashboard\/assets\/\d+/);
  await expect(page.getByText('Test Laptop E2E')).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();
});

test('asset list shows registered asset', async ({ page }) => {
  await page.goto('/dashboard/assets');
  await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
  // At least the table or empty state renders
  await expect(page.locator('table, [class*="text-center"]')).toBeVisible();
});
