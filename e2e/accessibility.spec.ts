import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Inhabit the Environment
  await page.goto('/');

  // 2. Anchor Check (System Integrity)
  // We wait for the Brand Header first. This is static.
  // If this times out, the app is crashing (White Screen of Death).
  await expect(
    page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
  ).toBeVisible({ timeout: 15000 });

  // 3. CTA Verification (Role-Agnostic)
  // We use getByText to catch the element regardless of whether it's a <button>, <a>, or <div>.
  // This bypasses the specific "Link vs Button" semantic mismatch.
  const exploreCta = page.getByText('Explore The Guild');
  const signInCta = page.getByText('Sign In').first(); // .first() handles potential duplicates

  await expect(exploreCta.or(signInCta).first()).toBeVisible();

  // 4. Run the Scan
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'section508'])
    .exclude('iframe')
    .analyze();

  // 5. Verification
  expect(results.violations).toEqual([]);
});
