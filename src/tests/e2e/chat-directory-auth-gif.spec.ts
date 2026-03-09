import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { USER_ID } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Signed-in auth resilience + GIF flow', () => {
  test('signed-in member can search and attach GIF in chat composer', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    // ---- Profile (RequireOnboarded) ----
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

    // ---- Chat rooms (.single() expects one object when URL has id=eq) ----
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

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    // ---- Tenor GIF ----
    await page.route('https://tenor.googleapis.com/v2/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'gif-1',
              content_description: 'Party',
              media_formats: {
                gif: {
                  url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                },
              },
            },
          ],
        }),
      });
    });

    await page.goto('/chat-popup/room-1');

    await expect(page.getByRole('button', { name: 'Add GIF' })).toBeVisible({
      timeout: 15000,
    });
  });
});
