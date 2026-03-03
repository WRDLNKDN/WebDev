import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.describe('Home Page - High-Integrity Audit', () => {
  test('admin route should be reachable and accessible', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });

    const results = await new AxeBuilder({ page })
      .include('[data-testid="app-main"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
