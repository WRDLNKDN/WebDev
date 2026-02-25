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
      email: 'admin@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle: 'admin', full_name: 'Admin' },
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

test.describe('Admin auth callback health page', () => {
  test('renders auth callback health panel content shape', async ({ page }) => {
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

    await page.route('**/api/admin/auth-callback-logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: [
            {
              id: 'log-1',
              action: 'AUTH_CALLBACK_ERROR',
              actorEmail: null,
              createdAt: '2026-02-19T10:00:00.000Z',
              meta: {
                provider: 'google',
                next: '/feed',
                elapsed_ms: 20200,
                timed_out: true,
              },
            },
            {
              id: 'log-2',
              action: 'AUTH_CALLBACK_TIMEOUT_ALERT',
              actorEmail: null,
              createdAt: '2026-02-19T10:03:00.000Z',
              meta: {
                provider: 'google',
                next: '/feed',
                elapsed_ms: 25000,
                timed_out: true,
              },
            },
          ],
          meta: { total: 2 },
        }),
      });
    });

    await page.goto('/admin/auth-callback-health');
    await expect(page).toHaveURL(/\/admin\/auth-callback-health$/);

    const panel = page.getByTestId('admin-auth-callback-health-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Auth Callback Health')).toBeVisible();
    await expect(panel.getByText('Total records: 2')).toBeVisible();

    const rows = panel.getByTestId('admin-auth-callback-health-rows');
    await expect(rows).toContainText('AUTH_CALLBACK_ERROR');
    await expect(rows).toContainText('AUTH_CALLBACK_TIMEOUT_ALERT');
    await expect(rows).toContainText('provider: google');
    await expect(rows).toContainText('next: /feed');
    await expect(rows).toContainText('elapsed: 20200ms');
    await expect(rows).toContainText('timed_out: yes');
  });
});
