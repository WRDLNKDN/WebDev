import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Conversion Gateway
    await page.goto('/home');

    // 1. Wait for the app root
    await expect(page.locator('#root')).toBeVisible();

    // 2. Wait for the NEW H1 (This confirms the Skeleton is gone)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Welcome to your professional community/i,
      }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should render the brand and primary messaging', async ({ page }) => {
    // 1. Check Headline
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Welcome to your professional community/i,
      }),
    ).toBeVisible();

    // 2. Check Subtitle (This text was preserved)
    await expect(
      page.getByText(/Professional networking, but human/i),
    ).toBeVisible();

    // 3. Check Primary Action (The Pill Button)
    await expect(
      page.getByRole('button', { name: /Continue with Google/i }),
    ).toBeVisible();

    // 4. Run Accessibility Audit on the *Real* UI
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
