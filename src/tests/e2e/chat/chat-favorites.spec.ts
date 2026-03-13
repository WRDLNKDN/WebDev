import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const ROOM_ID = 'e2e-room-favorite-1111-4111-8111-111111111111';
const ROOM_ID_2 = 'e2e-room-favorite-2222-4222-8222-222222222222';
const OTHER_USER_ID = 'favorite-other-user-1';
const OTHER_USER_ID_2 = 'favorite-other-user-2';

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
        {
          room_id: ROOM_ID_2,
          last_content: 'Older message',
          last_created_at: new Date(Date.now() - 60_000).toISOString(),
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
    const roomTwo = {
      id: ROOM_ID_2,
      room_type: 'dm',
      name: null,
      created_by: USER_ID,
      created_at: new Date(Date.now() - 60_000).toISOString(),
      updated_at: new Date(Date.now() - 60_000).toISOString(),
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingle ? room : [room, roomTwo]),
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
        {
          room_id: ROOM_ID_2,
          user_id: USER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: ROOM_ID_2,
          user_id: OTHER_USER_ID_2,
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
      const payload = route.request().postDataJSON() as {
        room_id?: string;
        user_id?: string;
        is_favorite?: boolean;
      };
      favoriteState.value = Boolean(payload?.is_favorite);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            room_id: ROOM_ID,
            user_id: USER_ID,
            is_favorite: favoriteState.value,
          },
        ]),
      });
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
        {
          id: OTHER_USER_ID_2,
          handle: 'april',
          display_name: 'April Drake',
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
  test.describe.configure({ mode: 'serial' });
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

    await expect(favoriteButton).toHaveAttribute(
      'aria-label',
      /remove from favorites/i,
    );
    await expect(
      favoriteButton.getByTestId(`chat-room-favorite-icon-filled-${ROOM_ID}`),
    ).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(favoriteButton).toBeVisible({ timeout: 30_000 });
    await expect(favoriteButton).toHaveAttribute(
      'aria-label',
      /remove from favorites/i,
    );
    await expect(
      favoriteButton.getByTestId(`chat-room-favorite-icon-filled-${ROOM_ID}`),
    ).toBeVisible();
  });

  test('messenger overlay can be closed with Escape and toggles favorites', async ({
    page,
  }) => {
    const favoriteState = { value: false };
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubChatFavoritesSurface(page, favoriteState);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });

    const overlayPanel = page.getByTestId('messenger-overlay-panel');
    await expect(overlayPanel).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('dialog', { name: /messaging/i }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlayPanel).toHaveCount(0);

    const openMessagesButton = page.getByTestId('messenger-open-button');
    await expect(openMessagesButton).toBeVisible({ timeout: 10_000 });

    await openMessagesButton.click();
    await expect(overlayPanel).toBeVisible({ timeout: 10_000 });

    const favoriteButton = page.getByTestId(
      `messenger-overlay-favorite-${ROOM_ID}`,
    );
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
    await expect(
      favoriteButton.getByTestId(
        `messenger-overlay-favorite-icon-filled-${ROOM_ID}`,
      ),
    ).toBeVisible();
    expect(favoriteState.value).toBe(true);

    const roomNames = page
      .locator(
        '[data-testid="messenger-overlay-panel"] .MuiListItemButton-root',
      )
      .locator('p.MuiTypography-body2');
    await expect(roomNames.nth(0)).toContainText('Nick Clark');
    await expect(roomNames.nth(1)).toContainText('April Drake');

    await page.getByLabel('Close messages').click();
    await expect(overlayPanel).toHaveCount(0);
  });
});
