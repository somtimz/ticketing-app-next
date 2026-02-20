// e2e/admin/users.spec.ts
import { test, expect } from '../fixtures';

test.describe('Admin – user management', () => {
  test('user list loads with seeded agents', async ({ page }) => {
    await page.goto('/dashboard/agents');
    await expect(page.locator('main h1')).toContainText('Manage Agents');
    // Seeded data has agents — at least one h3 (user name) should be present
    await expect(page.locator('h3').first()).toBeVisible();
  });

  test('create new agent → agent appears in user list', async ({ page }) => {
    await page.goto('/dashboard/agents');

    // Open the add-agent form
    await page.click('button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Add New Agent")')).toBeVisible();

    // Fill in required fields using their IDs
    const uniqueName = `E2E Test Agent ${Date.now()}`;
    const uniqueEmail = `e2e-agent-${Date.now()}@example.com`;
    await page.fill('#fullName', uniqueName);
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'testpassword123');
    // Leave role as default ("Agent")

    await page.click('button:has-text("Create Agent")');

    // Form should close (success hides the form) and agent appears in list
    await expect(page.locator('h2:has-text("Add New Agent")')).not.toBeVisible();
    await expect(page.locator(`h3:has-text("${uniqueName}")`)).toBeVisible();
  });

  test('created agent name appears in the user list', async ({ page }) => {
    await page.goto('/dashboard/agents');

    // Create a new agent with a unique, recognizable name
    const uniqueName = `E2E Verify ${Date.now()}`;
    await page.click('button:has-text("Add Agent")');
    await page.fill('#fullName', uniqueName);
    await page.fill('#email', `verify-${Date.now()}@example.com`);
    await page.fill('#password', 'testpassword123');
    await page.click('button:has-text("Create Agent")');

    // After creation, form closes and user should appear in the list
    await expect(page.locator(`h3:has-text("${uniqueName}")`)).toBeVisible();
  });
});
