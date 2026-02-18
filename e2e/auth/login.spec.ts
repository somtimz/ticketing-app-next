// e2e/auth/login.spec.ts
import { test, expect } from '../fixtures';

test.describe('Login', () => {
  test('valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'agent1@company.com');
    await page.fill('#password', 'agent123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard/issue-logging');
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'agent1@company.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    const errorBox = page.locator('.bg-red-50');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('Invalid email or password');
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('#email', 'agent1@company.com');
    await page.fill('#password', 'agent123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard/issue-logging');

    // Click the Logout button in the header
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Confirm dashboard is now protected — should redirect back to login
    await page.goto('/dashboard/issue-logging');
    await expect(page).toHaveURL('/login');
  });
});
