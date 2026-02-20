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

  test('unauthenticated user redirects to join', async ({ page }) => {
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Signed-out: RequireOnboarded redirects to /join
    await expect(page).toHaveURL(/\/join/, { timeout: 10000 });
  });

  test('directory does not crash; unauthenticated redirects to join', async ({
    page,
  }) => {
    // No auth fixture: RequireOnboarded redirects to /join
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Wait for redirect (RequireOnboarded async check can take a few seconds)
    await expect(page).toHaveURL(/\/join/, { timeout: 15000 });

    const joinLink = page.getByRole('link', { name: /Join/i }).first();
    const joinButton = page.getByRole('button', { name: /Join/i }).first();
    const createProfile = page
      .getByRole('button', { name: /Create your profile/i })
      .first();
    await expect(joinLink.or(joinButton).or(createProfile)).toBeVisible({
      timeout: 10000,
    });
  });
});
