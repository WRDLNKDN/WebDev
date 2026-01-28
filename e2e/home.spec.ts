import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    // Ensure the Home page actually rendered
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

    // If your route is implemented as "stay on /admin and show login UI" this should pass.
    // If you instead redirect to /signin, this will fail and you should change the assertion below.
    await expect(page).toHaveURL(/\/admin(\b|\/|\?)/);

    await expect(page.locator('#root')).toBeVisible();

    // Admin page should render an H1 (either the admin shell OR a sign-in-required state)
    await expect(
      page.getByRole('heading', { level: 1, name: /admin/i }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).include('#root').analyze();

    expect(results.violations).toEqual([]);
  });
});
