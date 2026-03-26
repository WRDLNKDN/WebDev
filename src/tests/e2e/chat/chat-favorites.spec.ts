import type { Route } from '@playwright/test';

import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { wantsPgrstObjectResponse } from '../utils/postgrestFulfill';
import {
  parsePostgrestEqFilter,
  postgrestEqOrInColumnValues,
} from '../utils/postgrestUrlFilters';
import { stubAppSurface } from '../utils/stubAppSurface';

const ROOM_ID = 'e2e-room-favorite-1111-4111-8111-111111111111';
const ROOM_ID_2 = 'e2e-room-favorite-2222-4222-8222-222222222222';
const OTHER_USER_ID = 'favorite-other-user-1';
const OTHER_USER_ID_2 = 'favorite-other-user-2';

type RoomPrefs = Map<string, { is_favorite: boolean }>;

async function fulfillChatRoomPreferencesGet(
  route: Route,
  url: URL,
  roomPrefs: RoomPrefs,
  userId: string,
): Promise<void> {
  const wantsObject = wantsPgrstObjectResponse(route);
  const ids = postgrestEqOrInColumnValues(url, 'room_id');

  if (wantsObject) {
    const rid = ids[0];
    const row = rid && roomPrefs.has(rid) ? { room_id: rid } : null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: row === null ? 'null' : JSON.stringify(row),
    });
    return;
  }

  const rows = ids
    .filter((id) => roomPrefs.has(id))
    .map((id) => ({
      room_id: id,
      user_id: userId,
      is_favorite: roomPrefs.get(id)!.is_favorite,
    }));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(rows),
  });
}

async function fulfillChatRoomPreferencesPatch(
  route: Route,
  url: URL,
  roomPrefs: RoomPrefs,
  syncFavoriteState: () => void,
  userId: string,
): Promise<void> {
  const rid = parsePostgrestEqFilter(url, 'room_id');
  const uid = parsePostgrestEqFilter(url, 'user_id');
  const body = route.request().postDataJSON() as { is_favorite?: boolean };
  if (rid && uid === userId) {
    roomPrefs.set(rid, { is_favorite: Boolean(body?.is_favorite) });
    syncFavoriteState();
  }
  await route.fulfill({ status: 204, body: '' });
}

async function fulfillChatRoomPreferencesPost(
  route: Route,
  roomPrefs: RoomPrefs,
  syncFavoriteState: () => void,
): Promise<void> {
  const raw = route.request().postDataJSON() as
    | {
        room_id?: string;
        user_id?: string;
        is_favorite?: boolean;
      }
    | Array<{
        room_id?: string;
        user_id?: string;
        is_favorite?: boolean;
      }>;
  const rows = Array.isArray(raw) ? raw : [raw];
  for (const payload of rows) {
    if (payload.room_id) {
      roomPrefs.set(payload.room_id, {
        is_favorite: Boolean(payload.is_favorite),
      });
    }
  }
  syncFavoriteState();
  await route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify(rows),
  });
}

async function fulfillChatRoomPreferencesRoute(
  route: Route,
  roomPrefs: RoomPrefs,
  syncFavoriteState: () => void,
  userId: string,
): Promise<void> {
  const method = route.request().method();
  const url = new URL(route.request().url());

  if (method === 'GET') {
    await fulfillChatRoomPreferencesGet(route, url, roomPrefs, userId);
    return;
  }
  if (method === 'PATCH') {
    await fulfillChatRoomPreferencesPatch(
      route,
      url,
      roomPrefs,
      syncFavoriteState,
      userId,
    );
    return;
  }
  if (method === 'POST') {
    await fulfillChatRoomPreferencesPost(route, roomPrefs, syncFavoriteState);
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  });
}

async function stubChatFavoritesSurface(
  page: import('@playwright/test').Page,
  favoriteState: { value: boolean },
) {
  const roomPrefs = new Map<string, { is_favorite: boolean }>();
  if (favoriteState.value) {
    roomPrefs.set(ROOM_ID, { is_favorite: true });
  }

  const syncFavoriteState = () => {
    favoriteState.value = roomPrefs.get(ROOM_ID)?.is_favorite ?? false;
  };
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
    await fulfillChatRoomPreferencesRoute(
      route,
      roomPrefs,
      syncFavoriteState,
      USER_ID,
    );
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

    let favoriteButton = page.getByTestId(`chat-room-favorite-${ROOM_ID}`);
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

    favoriteButton = page.getByTestId(`chat-room-favorite-${ROOM_ID}`);
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

    // Desktop: no floating messenger button — reopen overlay via /chat (ChatRedirect → feed + openOverlay).
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
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
