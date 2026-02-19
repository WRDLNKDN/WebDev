import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();

  await expect(page.getByTestId('signed-out-landing')).toBeVisible({
    timeout: 15000,
  });

  await expect(
    page.getByRole('link', { name: /Join Us/i }).first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('Notifications route accessibility', async ({ page }) => {
  await page.goto('/dashboard/notifications');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
