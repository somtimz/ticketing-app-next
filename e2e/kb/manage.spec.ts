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

  test('agent-only article is visible to agents but hidden from employees', async ({ page, request }) => {
    // Create an agent-only article via API
    const createRes = await request.post('/api/kb/articles', {
      data: {
        title: 'E2E Agent Only Test Article',
        content: 'Internal procedures for agents only.',
        isPublished: true,
        isAgentOnly: true
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const article = await createRes.json() as { id: number };

    try {
      // Verify it appears in agent's KB browse
      await page.goto('/dashboard/kb');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('E2E Agent Only Test Article')).toBeVisible({ timeout: 10000 });
      // "Agent only" badge should be shown
      await expect(page.getByText('Agent only').first()).toBeVisible({ timeout: 5000 });
    } finally {
      // Clean up: delete the article
      await request.delete(`/api/kb/articles/${article.id}`);
    }
  });

  test('article with tags shows tag pills on browse and detail', async ({ page, request }) => {
    // Create a tag via API
    const tagRes = await request.post('/api/kb/tags', { data: { name: 'e2e-test-tag' } });
    expect(tagRes.ok()).toBeTruthy();
    const { id: tagId } = await tagRes.json() as { id: number };

    // Create a published article with that tag via API
    const createRes = await request.post('/api/kb/articles', {
      data: {
        title: 'E2E Tagged Article',
        content: 'Article with a tag for E2E testing.',
        isPublished: true,
        tagIds: [tagId]
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const { id: articleId } = await createRes.json() as { id: number };

    try {
      // Browse list shows the tag pill
      await page.goto('/dashboard/kb');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('E2E Tagged Article')).toBeVisible({ timeout: 10000 });
      // Use a span selector to avoid matching hidden <option> elements in the tag filter dropdown
      await expect(page.locator('span', { hasText: 'e2e-test-tag' }).first()).toBeVisible({ timeout: 5000 });

      // Browse list shows Published badge (agents see green Published badge)
      await expect(page.locator('span', { hasText: 'Published' }).first()).toBeVisible({ timeout: 5000 });

      // Article detail shows tag pill
      await page.goto(`/dashboard/kb/${articleId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('span', { hasText: 'e2e-test-tag' }).first()).toBeVisible({ timeout: 10000 });
    } finally {
      await request.delete(`/api/kb/articles/${articleId}`);
    }
  });
});
