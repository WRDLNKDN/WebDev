import { expect, test } from '@playwright/test';

test.describe('Directory Page', () => {
  test('unauthenticated user sees sign-in prompt', async ({ page }) => {
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Signed-out: should show prompt to sign in
    await expect(page.getByTestId('directory-sign-in-prompt')).toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.getByText(/Sign in to browse the Directory/i),
    ).toBeVisible();
  });

  test('directory page loads without error', async ({ page }) => {
    await page.goto('/directory');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // directory-page wraps both signed-out and signed-in views
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 10000,
    });
  });
});
