import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Inhabit the Environment
  await page.goto('/');

  // 2. Wait for the "Physical Layer" to settle
  // PATCH: We use an OR condition to find EITHER the Link (Hero) OR the Button (Header).
  // This is the "Flakiness Killer" you remember from Dynamis.
  const exploreLink = page.getByRole('link', { name: /Explore The Guild/i });
  const signInButton = page.getByRole('button', { name: /Sign In/i });

  // Wait for at least one of these primary affordances to be visible
  await expect(exploreLink.or(signInButton).first()).toBeVisible({
    timeout: 10000,
  });

  // 3. Verify the "Center of Gravity" (The H1)
  await expect(
    page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
  ).toBeVisible();

  // 4. Run the Scan
  const results = await new AxeBuilder({ page })
    .include('#root') // Scope to our app container
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'section508'])
    .exclude('iframe')
    .analyze();

  // 5. Verification
  expect(results.violations).toEqual([]);
});
