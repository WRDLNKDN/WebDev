import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { USER_ID } from './utils/auth';

test.describe('Signed-in auth resilience + GIF flow', () => {
  test('signed-in member can search and attach GIF in chat composer', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);

    // ---- Chat rooms ----
    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'room-1',
            room_type: 'dm',
            created_by: USER_ID,
          },
        ]),
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

    await expect(page.getByLabel(/add gif/i)).toBeVisible({ timeout: 15000 });
  });
});
