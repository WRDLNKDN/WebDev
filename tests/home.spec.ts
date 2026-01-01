import { test, expect } from '@playwright/test';

test('Verify weirdlinkedin loads correctly', async ({ page }) => {
  await page.goto('/'); // Uses the baseURL from config
  await expect(page).toHaveTitle(/weirdlinkedin/i); // High-integrity assertion
});
