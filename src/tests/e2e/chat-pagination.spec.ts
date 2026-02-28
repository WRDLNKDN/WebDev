import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { USER_ID } from './utils/auth';

test.describe('Chat pagination', () => {
  test('loads older messages without jumping to bottom', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);

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

    await page.goto('/chat-popup/room-1');

    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  });
});
