import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /WRDLNKDN/i,
    }),
  ).toBeVisible({ timeout: 10000 });

  await expect(
    page.getByRole('button', { name: /Continue with Google/i }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
