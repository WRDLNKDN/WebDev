import type { Page } from '@playwright/test';
import { USER_ID } from './auth';

/** Group room used only for @mention E2E stubs. */
export const GROUP_MENTION_ROOM_ID =
  'e2e-group-mention-1111-4111-8111-111111111111';

/** Second member in the group (has a handle, shown in @ autocomplete). */
export const GROUP_MENTION_PEER_ID = '00000000-0000-0000-0000-000000000002';

function parseEqFilter(url: URL, column: string): string | undefined {
  const raw = url.searchParams.get(column);
  if (!raw?.startsWith('eq.')) return undefined;
  return decodeURIComponent(raw.slice(3));
}

function parseInFilter(url: URL, column: string): string[] | undefined {
  const raw = url.searchParams.get(column);
  if (!raw?.startsWith('in.')) return undefined;
  const inner = raw.slice(3).replaceAll('(', '').replaceAll(')', '');
  if (!inner.trim()) return [];
  return inner.split(',').map((part) => decodeURIComponent(part.trim()));
}

function roomIdsFromChatMembersUrl(url: URL): string[] {
  const single = parseEqFilter(url, 'room_id');
  if (single) return [single];
  return parseInFilter(url, 'room_id') ?? [];
}

/**
 * Stubs Supabase REST/RPC for a **group** chat room so `useChatRooms` + `useChatDataLoader`
 * resolve members with handles (required for @mention UI). Registered **after**
 * `stubAppSurface` so these handlers win.
 */
export async function stubChatGroupMentionSurface(page: Page) {
  const roomId = GROUP_MENTION_ROOM_ID;
  const peerId = GROUP_MENTION_PEER_ID;

  const groupRoom = {
    id: roomId,
    room_type: 'group' as const,
    name: 'E2E Mention Group',
    created_by: USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const memberRow = (userId: string, role: 'admin' | 'member') => ({
    room_id: roomId,
    user_id: userId,
    role,
    joined_at: new Date().toISOString(),
    left_at: null,
  });

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
          room_id: roomId,
          last_content: 'Hello group',
          last_created_at: new Date().toISOString(),
          last_is_deleted: false,
          unread_count: 0,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/rpc/chat_create_dm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(roomId),
    });
  });

  await page.route('**/rest/v1/rpc/chat_create_group', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(roomId),
    });
  });

  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const accept = route.request().headers()['accept'] ?? '';
    const wantsObject = accept.includes('application/vnd.pgrst.object+json');
    const url = new URL(route.request().url());
    const idEq = parseEqFilter(url, 'id');
    const idIn = parseInFilter(url, 'id');
    const matches = idEq === roomId || Boolean(idIn?.includes(roomId));

    if (!matches) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wantsObject ? 'null' : '[]',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(wantsObject ? groupRoom : [groupRoom]),
    });
  });

  await page.route('**/rest/v1/chat_room_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const url = new URL(route.request().url());
    const select = url.searchParams.get('select') ?? '';
    const userEq = parseEqFilter(url, 'user_id');
    const roomIds = roomIdsFromChatMembersUrl(url);

    /* useChatRooms: memberships for current user (room_id only). */
    if (select === 'room_id' && userEq === USER_ID && roomIds.length === 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ room_id: roomId }]),
      });
      return;
    }

    /* useChatDataLoader: confirm user is in this room. */
    if (
      select === 'room_id' &&
      userEq === USER_ID &&
      roomIds.length === 1 &&
      roomIds[0] === roomId
    ) {
      const accept = route.request().headers()['accept'] ?? '';
      const wantsObject = accept.includes('application/vnd.pgrst.object+json');
      const row = { room_id: roomId };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(wantsObject ? row : [row]),
      });
      return;
    }

    /* Full member rows for this room (useChatRooms / useChatDataLoader). */
    if (select.includes('user_id') && roomIds.includes(roomId)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          memberRow(USER_ID, 'admin'),
          memberRow(peerId, 'member'),
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

  await page.route('**/rest/v1/chat_room_preferences*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/rest/v1/feed_connections*', async (route) => {
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

  const memberProfile = {
    id: USER_ID,
    handle: 'e2e-member',
    display_name: 'E2E Member',
    avatar: null,
    status: 'approved',
  };
  const peerProfile = {
    id: peerId,
    handle: 'mentionbuddy',
    display_name: 'Mention Buddy',
    avatar: null,
    status: 'approved',
  };

  await page.route('**/rest/v1/profiles*', async (route) => {
    const url = new URL(route.request().url());
    const accept = route.request().headers()['accept'] ?? '';
    const wantsObject = accept.includes('application/vnd.pgrst.object+json');
    const idEq = parseEqFilter(url, 'id');
    const idIn = parseInFilter(url, 'id');

    if (idEq === USER_ID) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(wantsObject ? memberProfile : [memberProfile]),
      });
      return;
    }
    if (idEq === peerId) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(wantsObject ? peerProfile : [peerProfile]),
      });
      return;
    }

    const inList = idIn ?? [];
    const picked = [memberProfile, peerProfile].filter(
      (p) => inList.length === 0 || inList.includes(p.id),
    );
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(picked.length > 0 ? picked : [memberProfile]),
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
          id: 'msg-mention-created',
          room_id: payload.room_id ?? roomId,
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
          id: 'msg-mention-seed',
          room_id: roomId,
          sender_id: peerId,
          content: 'Welcome to the group',
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

  await page.route('**/rest/v1/chat_read_receipts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}
