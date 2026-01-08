import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa']) // Specifically targeting WCAG 2.2
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
