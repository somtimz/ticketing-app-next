// e2e/kb/manage.spec.ts
import { test, expect } from '../fixtures';

test.describe('Knowledge Base – manage (Agent role)', () => {
  test('create new draft article', async ({ page }) => {
    await page.goto('/dashboard/kb/new');
    await expect(page.locator('h1')).toContainText('New KB Article');

    await page.fill('input[placeholder="Article title"]', 'E2E Draft Article');
    await page.fill('textarea[placeholder="Write your article content in Markdown..."]', '## Summary\n\nThis is an E2E test article.');
    // Leave "Publish immediately" unchecked — creates a draft
    await page.click('button[type="submit"]');

    // Redirects to the new article's detail page
    await page.waitForURL(/\/dashboard\/kb\/\d+/);
    await expect(page.locator('h1')).toContainText('E2E Draft Article');
  });

  test('publish article', async ({ page }) => {
    await page.goto('/dashboard/kb/new');

    await page.fill('input[placeholder="Article title"]', 'E2E Published Article');
    await page.fill('textarea[placeholder="Write your article content in Markdown..."]', '## Fix\n\nRestart the service to resolve this issue.');
    await page.check('#isPublished'); // "Publish immediately"
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard\/kb\/\d+/);
    // Published articles should NOT show a "Draft" badge
    await expect(page.locator('span:has-text("Draft")')).not.toBeVisible();
  });

  test('edit existing article', async ({ page }) => {
    // Navigate to the KB list and pick the first article
    await page.goto('/dashboard/kb');
    const firstArticle = page.locator('a[href*="/dashboard/kb/"]').first();
    const href = await firstArticle.getAttribute('href');
    const articleId = href?.split('/').pop();

    await page.goto(`/dashboard/kb/${articleId}/edit`);
    await expect(page.locator('h1')).toBeVisible();

    // Update the title
    const titleInput = page.locator('input[placeholder="Article title"]');
    await titleInput.clear();
    await titleInput.fill('E2E Updated Article Title');
    await page.click('button[type="submit"]');

    // Should redirect back to the article detail
    await page.waitForURL(/\/dashboard\/kb\/\d+/);
    await expect(page.locator('h1')).toContainText('E2E Updated Article Title');
  });
});
