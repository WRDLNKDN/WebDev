import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

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
      user_metadata: { handle: 'member' },
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

async function fulfillPostgrest(route: Route, rowOrRows: unknown) {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(
      isSingle && Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows,
    ),
  });
}

test.describe('Notifications mobile layout', () => {
  test('connection request actions stack on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
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
        body: JSON.stringify(false),
      });
    });

    await page.route('**/rest/v1/notifications*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: 'notif-1',
          recipient_id: USER_ID,
          actor_id: OTHER_ID,
          type: 'connection_request',
          reference_id: 'request-1',
          reference_type: 'connection_request',
          payload: {},
          created_at: new Date().toISOString(),
          read_at: null,
        },
      ]);
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.includes('select=display_name%2Cjoin_reason')) {
        await fulfillPostgrest(route, [
          {
            id: USER_ID,
            display_name: 'Member',
            join_reason: ['networking'],
            participation_style: ['builder'],
            policy_version: '1.0',
          },
        ]);
        return;
      }
      await fulfillPostgrest(route, [
        {
          id: OTHER_ID,
          handle: 'other-member',
          display_name: 'Other Member',
          avatar: null,
        },
      ]);
    });

    await page.route('**/rest/v1/connection_requests*', async (route) => {
      await fulfillPostgrest(route, [{ id: 'request-1', status: 'pending' }]);
    });

    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications/);
    const approveButton = page.getByRole('button', { name: 'Approve' });
    await expect(approveButton).toBeVisible();

    const buttonStack = approveButton.locator(
      'xpath=ancestor::*[contains(@class,"MuiStack-root")][1]',
    );
    const stackDirection = await buttonStack.evaluate(
      (el) => window.getComputedStyle(el).flexDirection,
    );
    expect(stackDirection).toBe('column');

    const declineButton = page.getByRole('button', { name: 'Decline' });
    const [approveWidth, declineWidth] = await Promise.all([
      approveButton.evaluate((el) => el.getBoundingClientRect().width),
      declineButton.evaluate((el) => el.getBoundingClientRect().width),
    ]);
    expect(Math.abs(approveWidth - declineWidth)).toBeLessThanOrEqual(2);
  });
});
