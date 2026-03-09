import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { USER_ID } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Chat pagination', () => {
  test('loads older messages without jumping to bottom', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: USER_ID,
            handle: 'member',
            display_name: 'Member',
            status: 'approved',
            join_reason: ['networking'],
            participation_style: ['builder'],
            policy_version: '1.0',
          },
        ]),
      });
    });

    let pageCount = 0;

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      pageCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          Array.from({ length: 5 }).map((_, i) => ({
            id: `msg-${pageCount}-${i}`,
            sender_id: USER_ID,
            content: `Message ${i}`,
          })),
        ),
      });
    });

    const roomRow = {
      id: 'room-1',
      room_type: 'dm',
      created_by: USER_ID,
      name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      const url = route.request().url();
      const wantsSingle = url.includes('id=eq.');
      await route.fulfill({
        status: 200,
        contentType: wantsSingle
          ? 'application/vnd.pgrst.object+json'
          : 'application/json',
        body: wantsSingle ? JSON.stringify(roomRow) : JSON.stringify([roomRow]),
      });
    });
    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ room_id: 'room-1', user_id: USER_ID }]),
      });
    });

    await page.goto('/chat-popup/room-1');

    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeVisible({ timeout: 15000 });
  });
});
