import { expect, test } from '../fixtures';

test.describe('Storefront', () => {
  test('/store shows in-app Ecwid embed target when flag is on', async ({
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
      page.getByRole('heading', { name: 'Store', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#my-store-129462253')).toBeAttached();

    await expect
      .poll(async () =>
        page.evaluate(() =>
          Boolean(
            document.querySelector('script[src*="app.ecwid.com/script.js"]'),
          ),
        ),
      )
      .toBeTruthy();
  });
});
