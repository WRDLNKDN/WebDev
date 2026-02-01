import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Inhabit the Environment
  await page.goto('/');

  // 2. System Audit: Wait for the main content container to exist
  // This ensures the React hydration has completed.
  const mainLandmark = page.getByRole('main');
  await expect(mainLandmark).toBeVisible({ timeout: 15000 });

  // 3. Anchor Check: Find the H1 by role specifically.
  // This is better for accessibility testing than just 'locator(h1)'.
  const heading = page.getByRole('heading', { level: 1, name: /WRDLNKDN/i });
  await heading.waitFor({ state: 'visible' });

  // 4. Verification: Check the CTA exists (Role-Agnostic check)
  // Since you have a Link (RouterLink) that looks like a Button,
  // 'getByRole(link)' is the technically correct A11y check.
  const cta = page.getByRole('link', { name: /Explore|Enter/i });
  await expect(cta).toBeVisible();

  // 5. Run the Scan
  // We include '#root' to skip the browser chrome and focus on your code.
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'section508'])
    .analyze();

  // 6. Logic Gate
  // If there are violations, the system has an 'Efficiency Trap'.
  expect(results.violations).toEqual([]);
});
