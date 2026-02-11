import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible();

    // Wait for signed-out landing: wordmark WRDLNKDN (confirms skeleton is gone)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /WRDLNKDN/i,
      }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /WRDLNKDN/i,
      }),
    ).toBeVisible();

    await expect(page.getByText(/Business, But Weirder/i)).toBeVisible();

    await expect(
      page.getByText(/Showcase your professional identity/i),
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /Continue with Google/i }),
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
    await expect(page.locator('#root')).toBeVisible();

    // Admin shell shows "Admin Moderation" or similar
    // Note: Since you aren't logged in, this might redirect or show a "Not Authorized"
    // depending on your protection logic. Assuming it renders *something* accessible:
    const results = await new AxeBuilder({ page }).include('#root').analyze();

    expect(results.violations).toEqual([]);
  });
});
