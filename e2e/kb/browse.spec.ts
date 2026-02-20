// e2e/kb/browse.spec.ts
import { test, expect } from '../fixtures';

test.describe('Knowledge Base – browse (Employee role)', () => {
  test('article list loads with published articles', async ({ page }) => {
    await page.goto('/dashboard/kb');
    await expect(page.locator('main h1')).toContainText('Knowledge Base');
    // At least one article from the seed should be visible
    const articles = page.locator('a[href*="/dashboard/kb/"]');
    await expect(articles.first()).toBeVisible();
  });

  test('search by keyword returns matching results', async ({ page }) => {
    await page.goto('/dashboard/kb');
    // "password" matches the seeded article "How to Reset Your Password"
    await page.fill('input[placeholder="Search articles..."]', 'password');
    // Wait for debounce (300ms in the component)
    await page.waitForTimeout(500);
    const results = page.locator('a[href*="/dashboard/kb/"]');
    await expect(results.first()).toBeVisible();
  });

  test('view article detail page', async ({ page }) => {
    await page.goto('/dashboard/kb');
    const firstArticle = page.locator('a[href*="/dashboard/kb/"]').first();
    await firstArticle.click();
    await page.waitForURL(/\/dashboard\/kb\/\d+/);
    // The article title appears on the detail page (use .first() — markdown content may also render an h1)
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('submit helpful feedback → button state changes', async ({ page }) => {
    await page.goto('/dashboard/kb');
    await page.locator('a[href*="/dashboard/kb/"]').first().click();
    await page.waitForURL(/\/dashboard\/kb\/\d+/);

    // Button text is "👍 Yes (N)" — use partial text match
    const helpfulBtn = page.locator('button').filter({ hasText: /Yes/ }).first();
    await expect(helpfulBtn).toBeVisible({ timeout: 15000 });
    await helpfulBtn.click();

    // After feedback, the button becomes disabled (voted state set)
    await expect(helpfulBtn).toBeDisabled({ timeout: 15000 });
    // No error should appear
    await expect(page.locator('.bg-red-50')).not.toBeVisible();
  });
});
