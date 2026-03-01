import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.describe('Home Page - High-Integrity Audit', () => {
  test('admin route should be reachable and accessible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
