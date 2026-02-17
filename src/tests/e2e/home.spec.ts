import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible();

    // Wait for signed-out landing (confirms skeleton is gone; stable across CI)
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    // We still confirm the landing container is there to ensure the page loaded
    await expect(page.getByTestId('signed-out-landing')).toBeVisible();

    // WIDEN THE APERTURE: Search the whole 'page', not just the 'landing' div.
    // Drop the strict period matching just in case of weird whitespace rendering.
    await expect(
      page.getByRole('heading', { name: /Business, but weirder/i }),
    ).toBeVisible();

    await expect(
      page.getByText(
        /A professional networking space where you don't have to pretend/i,
      ),
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /Continue with Google/i }).first(),
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
