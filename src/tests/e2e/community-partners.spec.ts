import { expect, test, type Page } from '@playwright/test';

async function stubSharedRoutes(page: Page) {
  await page.route('**/api/me/avatar', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ avatarUrl: null }),
    });
  });
}

test.describe('Community Partners page', () => {
  test('footer link opens Community Partners page', async ({ page }) => {
    await stubSharedRoutes(page);
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 15000,
    });

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.getByRole('button', { name: 'Company' }).click();
    await page.getByRole('link', { name: 'Community Partners' }).click();

    await expect(page).toHaveURL(/\/community-partners$/);
    await expect(
      page.getByRole('heading', { name: 'Community Partners' }),
    ).toBeVisible();
  });

  test('shows Nettica fallback when admin list is empty', async ({ page }) => {
    await stubSharedRoutes(page);
    await page.route('**/rest/v1/community_partners*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/community-partners');
    await expect(
      page.getByRole('heading', { name: 'Community Partners' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nettica' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Visit partner' }),
    ).toBeVisible();
  });
});
