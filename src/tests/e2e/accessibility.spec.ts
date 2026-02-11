import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();

  await expect(page.getByTestId('signed-out-landing')).toBeVisible({
    timeout: 15000,
  });

  await expect(
    page.getByRole('button', { name: /Continue with Google/i }).first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
