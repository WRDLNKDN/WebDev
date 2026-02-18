import { expect, test } from '@playwright/test';

test.describe('Directory Page', () => {
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

    await expect(page.getByRole('link', { name: 'Join' }).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
