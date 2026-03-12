import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const ROOM_ID = 'e2e-room-favorite-1111-4111-8111-111111111111';
const OTHER_USER_ID = 'favorite-other-user-1';

async function stubChatFavoritesSurface(
  page: import('@playwright/test').Page,
  favoriteState: { value: boolean },
) {
  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'directory', enabled: true },
        { key: 'events', enabled: true },
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

  await page.route('**/rest/v1/rpc/chat_room_summaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          room_id: ROOM_ID,
          last_content: 'Most recent message',
          last_created_at: new Date().toISOString(),
          last_is_deleted: false,
          unread_count: 0,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    const isSingle = route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json');
    const room = {
      id: ROOM_ID,
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
    const url = new URL(route.request().url());
    const select = url.searchParams.get('select') ?? '';
    const minimalMembership =
      select === 'room_id' ||
      (select.includes('room_id') && !select.includes('user_id'));

    if (minimalMembership) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ room_id: ROOM_ID }]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          room_id: ROOM_ID,
          user_id: USER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: ROOM_ID,
          user_id: OTHER_USER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/chat_room_preferences*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          favoriteState.value
            ? [
                {
                  room_id: ROOM_ID,
                  is_favorite: true,
                },
              ]
            : [],
        ),
      });
      return;
    }

    if (method === 'POST') {
      favoriteState.value = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            room_id: ROOM_ID,
            user_id: USER_ID,
            is_favorite: true,
          },
        ]),
      });
      return;
    }

    if (method === 'DELETE') {
      favoriteState.value = false;
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
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
          id: OTHER_USER_ID,
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

test.describe('Chat favorites', () => {
  test('toggle favorite shows feedback and persists after reload', async ({
    page,
  }) => {
    const favoriteState = { value: false };
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubChatFavoritesSurface(page, favoriteState);

    await page.goto(`/chat-full/${ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const favoriteButton = page.getByTestId(`chat-room-favorite-${ROOM_ID}`);
    await expect(favoriteButton).toBeVisible({ timeout: 30_000 });
    await expect(favoriteButton).toHaveAttribute(
      'aria-label',
      /add to favorites/i,
    );

    await favoriteButton.click();

    await expect(page.getByText('Added to favorites.')).toBeVisible();
    await expect(favoriteButton).toHaveAttribute(
      'aria-label',
      /remove from favorites/i,
    );
    expect(favoriteState.value).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(favoriteButton).toBeVisible({ timeout: 30_000 });
    await expect(favoriteButton).toHaveAttribute(
      'aria-label',
      /remove from favorites/i,
    );
  });
});
