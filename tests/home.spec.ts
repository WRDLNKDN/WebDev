import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local dev server (Vite)
    await page.goto('/');
  });

  test('should render the brand and primary navigation targets', async ({
    page,
  }) => {
    // 1. Verify Brand Identity (Human OS Entry Point)
    await expect(
      page.getByRole('heading', { name: /WeirdLinkedIn/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Professional networking, but human/i),
    ).toBeVisible();

    // 2. Verify Call to Action (Physical Layer Interaction)
    const directoryBtn = page.getByRole('link', { name: /View directory/i });
    const adminBtn = page.getByRole('link', { name: /Admin moderation/i });

    await expect(directoryBtn).toBeVisible();
    await expect(adminBtn).toBeVisible();

    // 3. Test Navigation Logic (Asynchronous Execution)
    await directoryBtn.click();
    await expect(page).toHaveURL(/\/directory/);
  });

  test('should pass WCAG 2.2 accessibility standards', async ({ page }) => {
    // Perform a System Audit for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    // If this fails, the 'Quality Gate' blocks the push
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should display the admin safety warning (System Audit Info)', async ({
    page,
  }) => {
    // Ensuring our 'Tip' is visible to prevent an Efficiency Trap/Security Leak
    const tip = page.getByText(/Admin requires a service role key/i);
    await expect(tip).toBeVisible();
    // Accessibility check: Is the tip using the correct semantic tag (caption)?
    // In MUI, this maps to a span with specific styling, but we check text presence.
    await expect(tip).toHaveClass(/MuiTypography-caption/);
  });
});
