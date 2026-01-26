import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  // Wait for app to stabilize so Axe doesn't scan an empty shell
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText(/WRDLNKDN/i).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
