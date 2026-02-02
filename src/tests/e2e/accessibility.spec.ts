import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  // Root exists
  await expect(page.locator('#root')).toBeVisible();

  // Prefer a stable app anchor over a specific heading that may change
  // If you add data-testid="app-shell" to your app root, use that instead.
  const appAnchor = page.locator('#root > *');
  await expect(appAnchor.first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
