import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const DM_ROOM_ID = 'e2e-redirect-dm-room-1111-4111-8111-111111111111';
const WITH_USER_ID = 'e2e-redirect-with-user-2222-4222-8222-222222222222';

async function stubChatFromDirectoryFlow(
  page: import('@playwright/test').Page,
) {
  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'directory', enabled: true },
        { key: 'events', enabled: true },
        { key: 'feed', enabled: true },
        { key: 'store', enabled: false },
        { key: 'chat', enabled: true },
      ]),
    });
  });

  await page.route('**/rest/v1/rpc/is_admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'false',
    });
  });

  await page.route('**/rest/v1/rpc/chat_create_dm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DM_ROOM_ID),
    });
  });

  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    const isSingle = route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json');
    const room = {
      id: DM_ROOM_ID,
      room_type: 'dm',
      name: null,
      created_by: USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingle ? room : [room]),
    });
  });

  await page.route('**/rest/v1/chat_room_members*', async (route) => {
    const url = decodeURIComponent(route.request().url());
    const bothMembers = [
      {
        room_id: DM_ROOM_ID,
        user_id: USER_ID,
        role: 'member',
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        room_id: DM_ROOM_ID,
        user_id: WITH_USER_ID,
        role: 'member',
        joined_at: new Date().toISOString(),
        left_at: null,
      },
    ];
    const userEq = url.match(/user_id=eq\.([^&)]+)/);
    const roomEq = url.match(/room_id=eq\.([^&)]+)/);
    const isMembershipProbe =
      userEq &&
      (url.includes('select=room_id') ||
        url.split('select=')[1]?.startsWith('room_id'));
    if (isMembershipProbe && userEq && roomEq) {
      const uid = userEq[1];
      const rid = roomEq[1];
      const inRoom = bothMembers.some(
        (m) => m.user_id === uid && m.room_id === rid,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(inRoom ? [{ room_id: rid, user_id: uid }] : []),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(bothMembers),
    });
  });

  await page.route('**/rest/v1/chat_messages*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/chat_blocks*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  const fulfillFeeds = async (route: import('@playwright/test').Route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], nextCursor: null }),
    });
  };
  // Globs: `/api/feeds?limit=…` does not match `**/api/feeds*` in Playwright (see feed-reaction-picker).
  await page.route('**/api/feeds', fulfillFeeds);
  await page.route('**/api/feeds?**', fulfillFeeds);
}

test.describe('Chat redirect', () => {
  test('navigating to /chat?with=<user> does not crash and settles on chat/feed shell', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/chat?with=connected-user-1', {
      waitUntil: 'domcontentloaded',
    });

    await expect
      .poll(
        async () => ['/feed', '/chat'].includes(new URL(page.url()).pathname),
        { timeout: 30_000 },
      )
      .toBeTruthy();
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('error-boundary-fallback')).toHaveCount(0);
  });

  test('opening chat from Directory (/?with=user) shows message input and it is usable', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
    await stubChatFromDirectoryFlow(page);

    await page.goto('/chat?with=' + WITH_USER_ID, {
      waitUntil: 'domcontentloaded',
    });

    await expect
      .poll(async () => new URL(page.url()).pathname === '/feed', {
        timeout: 15_000,
      })
      .toBeTruthy();

    const messageInput = page.getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible({ timeout: 10_000 });
    await expect(messageInput).toBeEnabled();

    await messageInput.fill('Hello from E2E');
    await expect(messageInput).toHaveValue('Hello from E2E');
  });
});
