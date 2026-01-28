import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Global Accessibility Audit', async ({ page }) => {
  // 1. Inhabit the Environment
  await page.goto('/');

  // 2. Wait for the "Physical Layer" to settle (Wait for the spinner to vanish)
  // We wait for the "Enter Directory" button to be visible, ensuring loading is done.
  await expect(page.getByRole('link', { name: 'Enter Directory' })).toBeVisible(
    { timeout: 10000 },
  );

  // 3. Run the Audit
  const accessibilityScanResults = await new AxeBuilder({ page })
    .exclude('iframe') // Optional: exclude external noise
    .analyze();

  // 4. Verification
  expect(accessibilityScanResults.violations).toEqual([]);
});
