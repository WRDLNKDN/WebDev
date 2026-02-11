import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible();

    // Wait for signed-out landing (confirms skeleton is gone; stable across CI)
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    const landing = page.getByTestId('signed-out-landing');

    await expect(landing.getByText('WRDLNKDN')).toBeVisible();

    await expect(landing.getByText(/Business, But Weirder/i)).toBeVisible();

    await expect(
      landing.getByText(/Showcase your professional identity/i),
    ).toBeVisible();

    await expect(
      landing.getByRole('button', { name: /Continue with Google/i }),
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
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    const results = await new AxeBuilder({ page }).include('#root').analyze();

    expect(results.violations).toEqual([]);
  });
});
