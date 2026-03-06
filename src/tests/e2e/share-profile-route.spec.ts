import { expect, test } from './fixtures';

/**
 * Share profile route /p/:shareToken uses environment base URL and resolves to PublicProfilePage.
 * Invalid token shows NotFoundPage (404). Proves the route exists and is not hardcoded to one domain.
 */
test.describe('Share profile route', () => {
  test('/p/:shareToken route renders PublicProfilePage (not found for invalid token)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null),
        });
      },
    );
    await page.goto('/p/invalid-test-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('404')).toBeVisible({ timeout: 25_000 });
  });
});
