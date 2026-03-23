import { expect, test } from '../fixtures';

test.describe('Storefront', () => {
  test('/store opens external shop in a new tab and returns to home', async ({
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

    const popupPromise = page.waitForEvent('popup');
    await page.goto('/store', { waitUntil: 'domcontentloaded' });

    const popup = await popupPromise;
    try {
      await expect(popup).toHaveURL(
        /wrdlnkdn\.com\/store-1|company\.site|ecwid/i,
        {
          timeout: 15_000,
        },
      );
    } finally {
      await popup.close().catch(() => {});
    }

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });
});
