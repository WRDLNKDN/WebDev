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

test.describe('Header responsive integrity', () => {
  test.use({ viewport: { width: 1050, height: 900 } });

  test('signed-out header adapts without overlap at narrow desktop widths', async ({
    page,
  }) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ avatarUrl: null }),
      });
    });

    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Open menu')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Store' })).toHaveCount(0);
  });

  test('signed-in and admin-capable headers adapt without overlap', async ({
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

    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Open menu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0);
  });
});
