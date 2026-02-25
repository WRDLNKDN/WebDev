import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ROOM_ID = '33333333-3333-4333-8333-333333333333';

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

test.describe('Groups navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page);

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/api/feeds**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], nextCursor: null }),
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });

    await page.route('**/rest/v1/feed_advertisers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'Member',
          avatar: null,
          status: 'approved',
          join_reason: ['networking'],
          participation_style: ['builder'],
          policy_version: '1.0',
        },
        {
          id: OTHER_ID,
          handle: 'group-friend',
          display_name: 'Group Friend',
          avatar: null,
          status: 'approved',
        },
      ]);
    });

    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await fulfillPostgrest(route, [
        {
          room_id: GROUP_ROOM_ID,
          user_id: USER_ID,
          role: 'admin',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: GROUP_ROOM_ID,
          user_id: OTHER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);
    });

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: GROUP_ROOM_ID,
          room_type: 'group',
          name: 'Design Guild',
          created_by: USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    });

    await page.route('**/rest/v1/chat_blocks*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/rpc/chat_room_summaries', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            room_id: GROUP_ROOM_ID,
            last_content: 'Last update from group',
            last_created_at: new Date().toISOString(),
            last_is_deleted: false,
            unread_count: 2,
          },
        ]),
      });
    });

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      await fulfillPostgrest(route, []);
    });
    await page.route('**/rest/v1/chat_message_reactions*', async (route) => {
      await fulfillPostgrest(route, []);
    });
    await page.route('**/rest/v1/chat_message_attachments*', async (route) => {
      await fulfillPostgrest(route, []);
    });
    await page.route('**/rest/v1/chat_read_receipts*', async (route) => {
      await fulfillPostgrest(route, []);
    });
  });

  test('forums alias redirects to groups and opens selected group', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });

    await page.goto('/forums');
    await expect(page).toHaveURL(/\/groups/);
    await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
    await expect(page.getByText('Design Guild')).toBeVisible();

    await page.getByRole('link', { name: 'Open Group' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/chat-full/${GROUP_ROOM_ID}$`));
  });
});
