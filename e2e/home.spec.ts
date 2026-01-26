// e2e/home.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
    ).toBeVisible();

    await expect(
      page.getByText(/Professional networking, but human/i),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('admin route should be reachable and accessible', async ({ page }) => {
    await page.goto('/admin');

    // Prove we did not get redirected
    await expect(page).toHaveURL(/\/admin(\b|\/|\?)/);

    // Prove the route actually rendered content
    await expect(page.locator('#root')).toBeVisible();

    // Critical: prove there is at least one H1 on the rendered page.
    // If this fails, your /admin route is NOT rendering AdminGate/AdminApp.
    await expect(page.locator('h1')).toHaveCount(1);

    // Optional: sanity check the H1 text if you want it strict
    await expect(page.locator('h1')).toHaveText(/admin/i);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
