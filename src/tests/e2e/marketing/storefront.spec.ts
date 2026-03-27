import { expect, test } from '../fixtures';

type StorefrontTestWindow = Window &
  typeof globalThis & {
    __storeRedirectTarget?: string;
    __restoreStoreReplace?: () => void;
  };

test.describe('Storefront', () => {
  test('/store redirects to the canonical storefront when no merch URL is configured', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const testWindow = window as unknown as StorefrontTestWindow;

      Object.defineProperty(window, '__storeRedirectTarget', {
        configurable: true,
        writable: true,
        value: '',
      });

      const originalReplace = Location.prototype.replace;
      Location.prototype.replace = function replace(url: string | URL) {
        testWindow.__storeRedirectTarget = String(url);
      };

      Object.defineProperty(window, '__restoreStoreReplace', {
        configurable: true,
        value: () => {
          Location.prototype.replace = originalReplace;
        },
      });
    });

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
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as StorefrontTestWindow).__storeRedirectTarget ??
            '',
        ),
      )
      .toBe('https://wrdlnkdn.company.site/');
  });
});
