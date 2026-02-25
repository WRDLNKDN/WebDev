import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const ROOM_ID = '33333333-3333-4333-8333-333333333333';

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

function makeMessages() {
  const base = Date.parse('2026-02-20T00:00:00.000Z');
  return Array.from({ length: 75 }, (_v, idx) => {
    const n = idx + 1;
    return {
      id: `msg-${n.toString().padStart(3, '0')}`,
      room_id: ROOM_ID,
      sender_id: n % 2 === 0 ? USER_ID : OTHER_ID,
      content: `message ${n}`,
      is_system_message: false,
      is_deleted: false,
      edited_at: null,
      created_at: new Date(base + n * 1000).toISOString(),
    };
  });
}

test.describe('Chat pagination', () => {
  test('loads older messages without jumping to bottom', async ({ page }) => {
    const allMessages = makeMessages();
    let olderPageRequested = false;
    await seedSignedInSession(page);

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
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
          handle: 'friend',
          display_name: 'Friend',
          avatar: null,
        },
      ]);
    });

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: ROOM_ID,
          room_type: 'dm',
          name: null,
          created_by: USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    });

    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await fulfillPostgrest(route, [
        {
          room_id: ROOM_ID,
          user_id: USER_ID,
          role: 'admin',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: ROOM_ID,
          user_id: OTHER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);
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

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      const reqUrl = decodeURIComponent(route.request().url());
      if (reqUrl.includes('created_at=lt.')) {
        olderPageRequested = true;
        await fulfillPostgrest(route, allMessages.slice(0, 15).reverse());
        return;
      }
      await fulfillPostgrest(route, allMessages.slice(15).reverse());
    });

    await page.goto(`/chat-popup/${ROOM_ID}`);
    const list = page.getByTestId('chat-message-scroll');
    await expect(list).toContainText('message 75');
    await expect(page.getByTestId('chat-load-older')).toBeVisible();
    await list.evaluate((el) => {
      el.scrollTop = 0;
    });
    const beforeTop = await list.evaluate((el) => el.scrollTop);

    await page.getByTestId('chat-load-older').click();
    await expect.poll(() => olderPageRequested).toBe(true);

    const afterTop = await list.evaluate((el) => el.scrollTop);
    expect(afterTop - beforeTop).toBeLessThan(40);
  });
});
