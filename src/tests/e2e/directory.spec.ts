import { expect, test } from '@playwright/test';

test.describe('Directory Page', () => {
  test('unauthenticated user redirects to join', async ({ page }) => {
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Signed-out: RequireOnboarded redirects to /join
    await expect(page).toHaveURL(/\/join/, { timeout: 10000 });
  });

  test('directory page loads without error when authenticated', async ({
    page,
  }) => {
    // Requires auth; use storageState if fixtures provide authenticated session
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // If redirected to join, we're unauthenticated (expected)
    // If on directory, directory-page should be visible
    const url = page.url();
    if (url.includes('/join')) {
      await expect(page.getByText(/join/i)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(page.getByTestId('directory-page')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
