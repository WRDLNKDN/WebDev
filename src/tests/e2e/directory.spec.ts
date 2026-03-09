import { expect, test } from '@playwright/test';

test.describe('Directory Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });
    // Stub profiles so RequireOnboarded can resolve (no session → redirect) without hanging
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });
  });

  test('unauthenticated user redirects to home', async ({ page }) => {
    await page.goto('/directory', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await expect
      .poll(() => new URL(page.url()).pathname === '/', { timeout: 20000 })
      .toBe(true);
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 10000,
    });
  });

  test('directory does not crash; unauthenticated redirects to home', async ({
    page,
  }) => {
    await page.goto('/directory', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await expect
      .poll(() => new URL(page.url()).pathname === '/', { timeout: 20000 })
      .toBe(true);

    await expect(
      page.getByRole('link', { name: /Join|Sign in/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
