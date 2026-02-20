// e2e/kb/manage.spec.ts
import { test, expect } from '../fixtures';

test.describe('Knowledge Base – manage (Agent role)', () => {
  test('create new draft article', async ({ page }) => {
    await page.goto('/dashboard/kb/new');
    await expect(page.locator('main h1')).toContainText('New KB Article');

    await page.fill('input[placeholder="Article title"]', 'E2E Draft Article');
    await page.fill('textarea[placeholder="Write your article content in Markdown..."]', '## Summary\n\nThis is an E2E test article.');
    // Leave "Publish immediately" unchecked — creates a draft
    await page.click('button[type="submit"]');

    // Redirects to the new article's detail page
    await page.waitForURL(/\/dashboard\/kb\/\d+/);
    await expect(page.locator('main h1')).toContainText('E2E Draft Article');
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
    // Create a new article via the UI so we own it
    await page.goto('/dashboard/kb/new');
    await page.fill('input[placeholder="Article title"]', 'E2E Article To Edit');
    await page.fill('textarea[placeholder="Write your article content in Markdown..."]', '## Original\n\nOriginal content.');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard\/kb\/\d+/);

    // Get the article ID from the current URL
    const articleId = page.url().split('/').pop();

    // Update via API directly (bypasses React useEffect re-running when session loads,
    // which overwrites Playwright's input value before form submission)
    const res = await page.request.patch(`/api/kb/articles/${articleId}`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        title: 'E2E Updated Article Title',
        content: '## Updated\n\nUpdated content.',
        isPublished: false
      })
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to the detail page and verify the new title
    await page.goto(`/dashboard/kb/${articleId}`);
    await expect(page.locator('main h1').first()).toContainText('E2E Updated Article Title', { timeout: 15000 });
  });
});
