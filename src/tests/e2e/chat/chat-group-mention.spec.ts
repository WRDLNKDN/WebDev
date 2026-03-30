import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  GROUP_MENTION_ROOM_ID,
  stubChatGroupMentionSurface,
} from '../utils/stubChatGroupMentionSurface';

test.describe('Group chat @mention', () => {
  test('typing @ shows a mentionable member from the group', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubChatGroupMentionSurface(page);

    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(`/chat-full/${GROUP_MENTION_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const messageInput = page
      .getByTestId('chat-thread-column')
      .getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible({ timeout: 45_000 });
    await messageInput.click();
    await messageInput.fill('@');

    const mentionRow = page.getByRole('option', { name: /@mentionbuddy/i });
    await expect(mentionRow).toBeVisible({ timeout: 15_000 });
    await mentionRow.click();
    await expect(messageInput).toHaveValue(/@mentionbuddy\b/);
  });
});
