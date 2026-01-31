import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Inhabit the Environment
  await page.goto('/');

  // 2. Wait for the "Physical Layer" to settle
  // We wait for the Primary CTA to appear. This confirms the Auth logic has run
  // and the UI has decided between "Guest" or "User" state.
  await expect(
    page.getByRole('button', { name: /Sign In|Explore The Guild/i }),
  ).toBeVisible({ timeout: 10000 });

  // 3. Verify the "Center of Gravity" (The H1)
  await expect(
    page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
  ).toBeVisible();

  // 4. Run the Scan
  const results = await new AxeBuilder({ page })
    .include('#root') // Scope to our app container
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'section508']) // Full Compliance Stack
    .exclude('iframe') // Ignore external widgets (if any)
    .analyze();

  // 5. Verification
  expect(results.violations).toEqual([]);
});
