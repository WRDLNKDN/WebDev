import { expect, test } from '../fixtures';

test.describe('Storefront route', () => {
  test('embeds the storefront in-page and falls back to the GoDaddy URL in an iframe', async ({
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

    // Deterministic fallback when Ecwid is configured: script load fails → backup iframe.
    await page.route('https://app.ecwid.com/**', (route) => route.abort());

    await page.goto('/store', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/store$/);

    const iframe = page.locator('iframe[title="WRDLNKDN storefront"]');
    await expect(iframe).toBeVisible({ timeout: 20_000 });
    await expect(iframe).toHaveAttribute('src', 'https://wrdlnkdn.com/store-1');

    await expect(page.getByRole('heading', { name: /^Store$/ })).toBeVisible();
  });
});
