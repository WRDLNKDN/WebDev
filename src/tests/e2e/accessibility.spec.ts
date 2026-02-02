import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Global Accessibility Audit', async ({ page }) => {
  // App root "/" is LandingPage; brand content lives on "/home"
  await page.goto('/home');

  // Wait for React to render
  await expect(page.locator('#root')).toBeVisible();

  // Deterministic signal the app rendered the real UI
  await expect(
    page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
