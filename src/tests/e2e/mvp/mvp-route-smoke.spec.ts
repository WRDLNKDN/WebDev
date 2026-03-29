import { expect, test, type Page, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const E2E_ROOM_ID = 'mvp-room-1111-4111-8111-111111111111';

const FEED_ITEM = {
  id: 'mvp-feed-post-1',
  user_id: 'another-user',
  kind: 'post',
  payload: { body: 'MVP smoke post for the feed route.' },
  parent_id: null,
  created_at: '2026-03-06T12:00:00.000Z',
  edited_at: null,
  actor: {
    handle: 'member',
    display_name: 'Member',
    avatar: null,
    bio: 'Senior Engineering Manager',
  },
  like_count: 1,
  love_count: 0,
  inspiration_count: 0,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: null,
  comment_count: 0,
  viewer_saved: false,
};

async function stubFeed(page: Page) {
  const fulfillFeedList = async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [FEED_ITEM] }),
    });
  };

  await page.route('**/api/feeds', fulfillFeedList);
  await page.route('**/api/feeds?**', fulfillFeedList);
  await page.route('**/api/feeds/items/**/save', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route('**/api/feeds/items/**/reaction', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}

async function stubChatRoom(page: Page) {
  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    const isSingle = route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json');
    const room = {
      id: E2E_ROOM_ID,
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          room_id: E2E_ROOM_ID,
          user_id: USER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: E2E_ROOM_ID,
          user_id: 'other-user-1',
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const url = route.request().url();
    if (!url.includes('chat_room_members') && !url.includes('/profiles')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'Member',
          avatar: null,
        },
        {
          id: 'other-user-1',
          handle: 'nick',
          display_name: 'Nick Clark',
          avatar: null,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/chat_messages*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.describe('MVP route smoke', () => {
  test.beforeEach(async ({ page, context }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
  });

  test('dashboard route loads without hitting the error boundary', async ({
    page,
  }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('button', { name: /manage profile/i }),
    ).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('error-boundary-fallback')).toHaveCount(0);
  });

  test('dashboard notifications route loads', async ({ page }) => {
    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible({ timeout: 25_000 });
  });

  test('settings notifications route loads', async ({ page }) => {
    await page.goto('/dashboard/settings/notifications', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('heading', { name: 'Delivery Channels' }),
    ).toBeVisible({ timeout: 25_000 });
  });

  test('feed route loads a post', async ({ page }) => {
    await stubFeed(page);
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(FEED_ITEM.payload.body)).toBeVisible({
      timeout: 25_000,
    });
  });

  test('chat room route loads composer', async ({ page }) => {
    await stubChatRoom(page);
    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible({
      timeout: 35_000,
    });
    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeVisible();
  });

  test('public profile route resolves by handle token', async ({ page }) => {
    await page.goto('/p/h~member', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('heading', { name: 'Member', exact: true }),
    ).toBeVisible({ timeout: 25_000 });
  });
});
