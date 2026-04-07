import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubChatDmRoom } from '../utils/stubChatDmRoom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'upload-sample.txt',
);

const E2E_ROOM_ID = 'e2e-media-ux-room-1111-4111-8111-111111111111';

test.describe('Shared media upload UX', () => {
  test('shows the canonical media status banner while an attachment uploads', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatDmRoom(page, E2E_ROOM_ID);

    // Broad storage stub first; narrow chat-attachments route registered after so it
    // wins (Playwright matches most recently registered handler first).
    await page.route('**/storage/v1/object/**', async (route) => {
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.route(
      '**/storage/v1/object/chat-attachments/**',
      async (route) => {
        await new Promise((r) => {
          setTimeout(r, 5_000);
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: `${USER_ID}/party.gif` }),
        });
      },
    );

    await page.route('**/rest/v1/chat_message_attachments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(
      '**/storage/v1/object/sign/chat-attachments/**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            signedUrl:
              'https://example.supabase.co/storage/v1/object/sign/chat-attachments/fake.gif?token=e2e',
            signedURL:
              '/storage/v1/object/sign/chat-attachments/fake.gif?token=e2e',
          }),
        });
      },
    );

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByTestId('chat-thread-column').getByRole('textbox', {
        name: 'Message',
      }),
    ).toBeVisible({ timeout: 35_000 });

    const thread = page.getByTestId('chat-thread-column');
    const fileInput = page.getByTestId('chat-attachment-file-input');
    await fileInput.setInputFiles(UPLOAD_FIXTURE);
    await thread.getByRole('textbox', { name: 'Message' }).fill('attachment');

    const sendButton = thread.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeEnabled({ timeout: 15_000 });
    await sendButton.click();

    const banner = page.getByTestId('media-status-banner');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText(
      /Checking file|Uploading media|Optimizing media|Converting media|Media ready/,
    );
  });
});
