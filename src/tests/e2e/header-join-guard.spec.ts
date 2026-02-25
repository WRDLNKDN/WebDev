import { expect, test, type Page } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function mockSessionPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'member@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle: 'member', full_name: 'Member' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSession(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
  }, payload);
}

test.describe('Join header guard and wordmark routing', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('signed-in member on /join sees public header controls only', async ({
    page,
  }) => {
    await seedSignedInSession(page);

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true),
      });
    });

    await page.goto('/join');
    await expect(page).toHaveURL(/\/join/);
    await expect(page.getByRole('link', { name: 'WRDLNKDN' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Store' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Feed' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Directory' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Events' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByLabel('Search for members')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Notifications' }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0);
  });

  test('wordmark click from signed-in join route lands on canonical /', async ({
    page,
  }) => {
    await seedSignedInSession(page);

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.goto('/join');
    await expect(page).toHaveURL(/\/join/);
    await page.getByRole('link', { name: 'WRDLNKDN' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('signed-out-landing')).toBeVisible();
  });
});
