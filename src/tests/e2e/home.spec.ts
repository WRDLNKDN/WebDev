import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ avatarUrl: null }),
      });
    });
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible();

    // Wait for signed-out landing (confirms skeleton is gone; stable across CI)
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    const landing = page.getByTestId('signed-out-landing');
    await expect(landing).toBeVisible();

    await expect(landing.getByText(/WRDLNKDN/i)).toBeVisible();

    await expect(landing.getByText(/Business, but weirder/i)).toBeVisible();

    await expect(
      landing.getByText(
        /A professional networking space where you don't have to pretend/i,
      ),
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: /Join/i }).first(),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('#root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('admin route should be reachable and accessible', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin(\b|\/|\?)/);
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    // Wait for page to settle (no pending redirects) before axe; avoids
    // "Execution context was destroyed" when client-side nav runs during scan.
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .include('#root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
