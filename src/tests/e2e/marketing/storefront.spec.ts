import { expect, test } from '../fixtures';

test.describe('Storefront', () => {
  test('/store shows fallback copy when no merch URL is configured', async ({
    page,
  }) => {
    await page.route('**/rest/v1/feature_flags*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key: 'directory', enabled: true },
          { key: 'events', enabled: true },
          { key: 'store', enabled: true },
          { key: 'chat', enabled: false },
          { key: 'groups', enabled: true },
        ]),
      });
    });

    await page.goto('/store', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/store$/);
    await expect(
      page.getByRole('heading', { name: 'Store unavailable', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(
        'The merch site URL is not configured yet for this environment.',
      ),
    ).toBeVisible();
  });
});
