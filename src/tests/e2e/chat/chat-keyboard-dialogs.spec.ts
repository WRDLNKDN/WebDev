import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const ROOM_ID = 'e2e-room-keyboard-1111-4111-8111-111111111111';
const DM_TARGET_ID = 'keyboard-dm-target-1';
const GROUP_TARGET_ID = 'keyboard-group-target-1';

async function stubChatKeyboardSurface(page: import('@playwright/test').Page) {
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

  await page.route('**/rest/v1/rpc/chat_room_summaries*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          room_id: ROOM_ID,
          last_content: 'Keyboard flow message',
          last_created_at: new Date().toISOString(),
          last_is_deleted: false,
          unread_count: 0,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/rpc/chat_create_group', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('new-keyboard-group-room'),
    });
  });

  await page.route('**/rest/v1/rpc/chat_create_dm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ROOM_ID),
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
    const userIdFilter = url.searchParams.get('user_id');
    const roomIdFilter = url.searchParams.get('room_id');
    const minimalMembership =
      select === 'room_id' ||
      (select.includes('room_id') && !select.includes('user_id'));

    if (minimalMembership || userIdFilter?.includes(USER_ID)) {
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
            user_id: DM_TARGET_ID,
            role: 'member',
            joined_at: new Date().toISOString(),
            left_at: null,
          },
        ]),
      });
      return;
    }

    if (roomIdFilter?.includes(ROOM_ID)) {
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
            user_id: DM_TARGET_ID,
            role: 'member',
            joined_at: new Date().toISOString(),
            left_at: null,
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ room_id: ROOM_ID }]),
    });
  });

  await page.route('**/rest/v1/chat_room_preferences*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/feed_connections*', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('user_id') ?? '';
    const connectedUserId = url.searchParams.get('connected_user_id') ?? '';

    if (userId.includes(`eq.${USER_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ connected_user_id: DM_TARGET_ID }]),
      });
      return;
    }

    if (connectedUserId.includes(`eq.${USER_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: DM_TARGET_ID }]),
      });
      return;
    }

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

  await page.route('**/rest/v1/profiles*', async (route) => {
    const url = new URL(route.request().url());
    const idFilter = url.searchParams.get('id');
    const allProfiles = [
      {
        id: USER_ID,
        handle: 'member',
        display_name: 'Member',
        avatar: null,
        status: 'approved',
      },
      {
        id: DM_TARGET_ID,
        handle: 'dm-target',
        display_name: 'DM Target',
        avatar: null,
        status: 'approved',
      },
      {
        id: GROUP_TARGET_ID,
        handle: 'group-target',
        display_name: 'Group Target',
        avatar: null,
        status: 'approved',
      },
    ];

    const filteredProfiles = idFilter?.startsWith('in.(')
      ? allProfiles.filter((profile) => idFilter.includes(profile.id))
      : allProfiles;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(filteredProfiles),
    });
  });

  await page.route('**/rest/v1/chat_messages*', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as {
        content?: string | null;
        room_id?: string;
        sender_id?: string;
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-keyboard-created',
          room_id: payload.room_id ?? ROOM_ID,
          sender_id: payload.sender_id ?? USER_ID,
          content: payload.content ?? null,
          is_system_message: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'msg-keyboard-1',
          room_id: ROOM_ID,
          sender_id: USER_ID,
          content: 'Need to report this test message',
          is_system_message: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route('**/rest/v1/chat_message_reactions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/chat_message_attachments*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/chat_message_reads*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.describe('Chat keyboard dialogs', () => {
  test('toast dismisses with Escape and Enter starts chat/group flows', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubChatKeyboardSurface(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/chat-full/${ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const favoriteButton = page.getByTestId(`chat-room-favorite-${ROOM_ID}`);
    await expect(favoriteButton).toBeVisible({ timeout: 30_000 });
    await favoriteButton.click();

    const toast = page.locator('[role="status"], [role="alert"]').filter({
      hasText: 'Added to favorites.',
    });
    await expect(toast).toContainText('Added to favorites.');
    await page.keyboard.press('Escape');
    await expect(toast).toBeHidden({ timeout: 5_000 });

    await page.getByRole('button', { name: 'New chat' }).click();
    const startDialog = page.getByRole('dialog', { name: /start a chat/i });
    await expect(startDialog).toBeVisible();
    const searchInput = page.getByRole('textbox', {
      name: 'Search connections',
    });
    await searchInput.fill('DM Target');
    await searchInput.press('Enter');
    await expect(startDialog).toBeHidden({ timeout: 5_000 });

    await page.getByRole('button', { name: 'New group' }).click();
    const groupDialog = page.getByRole('dialog', { name: /create group/i });
    await expect(groupDialog).toBeVisible();
    await expect(groupDialog.getByText('DM Target')).toBeVisible();
    await expect(groupDialog.getByText('Group Target')).toHaveCount(0);
    await expect(
      groupDialog.getByRole('textbox', { name: 'Search connections' }),
    ).toBeVisible();
    const groupNameInput = page.getByRole('textbox', { name: 'Group name' });
    await groupNameInput.fill('Keyboard Group');
    await groupNameInput.press('Enter');
    await expect(groupDialog).toBeHidden({ timeout: 5_000 });
  });
});
