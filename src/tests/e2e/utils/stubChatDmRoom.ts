import type { Page, Route } from '@playwright/test';
import { USER_ID } from './auth';

export function requestWantsSingleObject(route: Route): boolean {
  return (
    route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json') ?? false
  );
}

export type StubChatDmRoomOptions = {
  /** When true, stubs a second member + matching profile rows (chat file upload flows). */
  includeSecondMember?: boolean;
  profileOverride?: Partial<{ handle: string; display_name: string | null }>;
};

/**
 * Minimal DM chat REST stubs for `/chat-full/:roomId` E2E tests.
 * Keeps message POST echo + GET list in memory for the page.
 */
export async function stubChatDmRoom(
  page: Page,
  roomId: string,
  options?: StubChatDmRoomOptions,
): Promise<void> {
  const messages: Array<Record<string, unknown>> = [];
  const includeSecondMember = options?.includeSecondMember ?? false;

  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    const isSingle = requestWantsSingleObject(route);
    const room = {
      id: roomId,
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

  const members = [
    {
      room_id: roomId,
      user_id: USER_ID,
      role: 'member',
      joined_at: new Date().toISOString(),
      left_at: null,
    },
    ...(includeSecondMember
      ? [
          {
            room_id: roomId,
            user_id: 'other-user-1',
            role: 'member',
            joined_at: new Date().toISOString(),
            left_at: null,
          },
        ]
      : []),
  ];

  await page.route('**/rest/v1/chat_room_members*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(members),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const idFilter = requestUrl.searchParams.get('id');
    const requestedId = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null;
    const profiles = [
      {
        id: USER_ID,
        handle: 'member',
        display_name: 'Member',
        avatar: null,
      },
      ...(includeSecondMember
        ? [
            {
              id: 'other-user-1',
              handle: options?.profileOverride?.handle ?? 'nick',
              display_name:
                options?.profileOverride?.display_name ?? 'Nick Clark',
              avatar: null,
            },
          ]
        : []),
    ];
    const matchedProfiles = requestedId
      ? profiles.filter((profile) => profile.id === requestedId)
      : profiles;
    const isSingle = requestWantsSingleObject(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isSingle ? (matchedProfiles[0] ?? null) : matchedProfiles,
      ),
    });
  });

  await page.route('**/rest/v1/chat_messages*', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as {
        content?: string | null;
        room_id?: string;
        sender_id?: string;
      };
      const message = {
        id: 'msg-e2e-1',
        room_id: payload.room_id ?? roomId,
        sender_id: payload.sender_id ?? USER_ID,
        content: payload.content ?? null,
        is_system_message: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      messages.splice(0, messages.length, message);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(message),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(messages),
    });
  });
}
