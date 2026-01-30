import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('WCAG 2.2 AA / Section 508 System Audit', () => {
  test('Landing Page (Unauthenticated State)', async ({ page }) => {
    // 1. Inhabit the Environment
    await page.goto('/');

    // 2. Wait for the "Logic Gate" to settle
    // Per the new Home.tsx, unauthenticated users see 'Explore The Guild'
    await expect(
      page.getByRole('link', { name: /explore the guild/i }),
    ).toBeVisible({
      timeout: 10000,
    });

    // 3. Verify Branding Integrity (WCAG Requirement: Semantic Headings)
    // Ensure the Brand (H1) and Phonetic Guide (P) are present
    await expect(
      page.getByRole('heading', { name: /wrdlnkdn/i, level: 1 }),
    ).toBeVisible();

    // 4. Run the Accessibility Scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa', 'section508']) // Target specific compliance rules
      .exclude('iframe')
      .analyze();

    // 5. Validation Logic
    // If this fails, the 'System Audit Failure' message in index.html serves as the fallback.
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
