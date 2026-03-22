import { expect, test } from '../fixtures';

test.describe('Storefront route', () => {
  test('keeps store navigation inside WRDLNKDN and preserves backup storefront access', async ({
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

    const externalStoreRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('wrdlnkdn.com/store-1')) {
        externalStoreRequests.push(url);
      }
    });

    await page.goto('/store', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/store$/);

    const backupLinks = page.getByRole('link', { name: /backup storefront/i });
    await expect(backupLinks.first()).toBeVisible({ timeout: 15_000 });
    await expect(backupLinks.first()).toHaveAttribute(
      'href',
      'https://wrdlnkdn.com/store-1',
    );

    const headings = page.getByRole('heading', { name: /^Store$/ });
    const fallbackHeading = page.getByRole('heading', {
      name: 'Store not configured',
    });

    await expect
      .poll(
        async () => (await headings.count()) + (await fallbackHeading.count()),
      )
      .toBeGreaterThan(0);

    expect(externalStoreRequests).toEqual([]);
  });
});
