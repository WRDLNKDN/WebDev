import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function stubAvatar(page: Page) {
  await page.route('**/api/me/avatar', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ avatarUrl: null }),
    });
  });
}

test('Global Accessibility Audit', async ({ page }) => {
  await stubAvatar(page);
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();

  await expect(page.getByTestId('signed-out-landing')).toBeVisible({
    timeout: 15000,
  });

  await expect(page.getByRole('link', { name: /Join/i }).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('Notifications route accessibility', async ({ page }) => {
  await stubAvatar(page);
  await page.goto('/dashboard/notifications');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
