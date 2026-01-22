import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Sanity: ensure the app has rendered something stable
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render the brand and primary navigation targets', async ({
    page,
  }) => {
    // Brand: do NOT assume it is a semantic heading unless your UI uses h1/h2
    // Prefer link first (common in app bars), then fall back to plain text.
    const brandLink = page.getByRole('link', { name: /WRDLNKDN/i });
    const brandText = page.getByText(/WRDLNKDN/i).first();

    // Try link, else text
    if (await brandLink.count()) {
      await expect(brandLink.first()).toBeVisible();
    } else {
      await expect(brandText).toBeVisible();
    }

    // Tagline (keep as-is, but this must match your current copy)
    await expect(
      page.getByText(/Professional networking, but human/i),
    ).toBeVisible();

    // Optional: quick Axe scan on home
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should display the admin safety warning (System Audit Info)', async ({
    page,
  }) => {
    // This warning belongs on the admin route, not home
    await page.goto('/admin');

    const tip = page.getByText(/Admin requires a service role key/i);
    await expect(tip).toBeVisible();

    // If you really want to assert MUI typography class, keep it,
    // but be aware classnames can change with MUI upgrades.
    await expect(tip).toHaveClass(/MuiTypography-caption/);

    // Optional: Axe scan on admin gate page
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});