import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // App root "/" is LandingPage; brand + messaging live on "/home"
    await page.goto('/home');
    await expect(page.locator('#root')).toBeVisible();

    await expect(
      page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
    ).toBeVisible();
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
    ).toBeVisible();

    await expect(
      page.getByText(/Professional networking, but human/i),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).include('#root').analyze();

    expect(results.violations).toEqual([]);
  });

  test('admin route should be reachable and accessible', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin(\b|\/|\?)/);
    await expect(page.locator('#root')).toBeVisible();

    // Admin shell shows "Admin Moderation" as h1
    await expect(
      page.getByRole('heading', { level: 1, name: /admin/i }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).include('#root').analyze();

    expect(results.violations).toEqual([]);
  });
});
