import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  // Wait for React to actually render real content
  await expect(page.locator('#root')).toBeVisible();

  // Strong, deterministic signal the app rendered the real UI
  await expect(
    page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    // Avoid scanning browser-injected or non-app DOM
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
