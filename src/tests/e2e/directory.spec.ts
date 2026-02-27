import { expect, test } from '@playwright/test';

test.describe('Directory Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ avatarUrl: null }),
      });
    });
  });

  test('unauthenticated user redirects to home', async ({ page }) => {
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Signed-out: RequireOnboarded redirects to /
    await expect
      .poll(() => new URL(page.url()).pathname === '/', { timeout: 15000 })
      .toBe(true);
  });

  test('directory does not crash; unauthenticated redirects to home', async ({
    page,
  }) => {
    // No auth fixture: RequireOnboarded redirects to /
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Wait for redirect (RequireOnboarded async check can take a few seconds)
    await expect
      .poll(() => new URL(page.url()).pathname === '/', { timeout: 15000 })
      .toBe(true);

    // Home shows Join and Sign in for guests
    await expect(
      page.getByRole('link', { name: /Join|Sign in/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
