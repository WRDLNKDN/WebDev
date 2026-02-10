import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Navigate to the new Conversion Gateway
  // (Note: If your router still maps this to '/home', change this back to '/home')
  await page.goto('/');

  // 2. Wait for the Skeleton to disappear and Real UI to mount
  //    The old H1 "WRDLNKDN" is gone. The new H1 is in GuestView.tsx.
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Welcome to your professional community/i,
    }),
  ).toBeVisible({ timeout: 10000 });

  // 3. Verify the primary call-to-action is interactive (Double check)
  await expect(
    page.getByRole('button', { name: /Continue with Google/i }),
  ).toBeVisible();

  // 4. Run Axe on the fully loaded state
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
