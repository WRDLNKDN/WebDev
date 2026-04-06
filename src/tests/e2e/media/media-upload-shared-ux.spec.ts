import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'upload-sample.txt',
);

const E2E_ROOM_ID = 'e2e-media-ux-room-1111-4111-8111-111111111111';

function requestWantsSingleObject(route: import('@playwright/test').Route) {
  return (
    route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json') ?? false
  );
}

async function stubChatRoom(page: import('@playwright/test').Page) {
  const messages: Array<Record<string, unknown>> = [];

  await page.route('**/rest/v1/chat_rooms*', async (route) => {
    const isSingle = requestWantsSingleObject(route);
    const room = {
      id: E2E_ROOM_ID,
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          room_id: E2E_ROOM_ID,
          user_id: USER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]),
    });
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
      ]),
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
        id: 'msg-media-ux-1',
        room_id: payload.room_id ?? E2E_ROOM_ID,
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

test.describe('Shared media upload UX', () => {
  test('shows the canonical media status banner while an attachment uploads', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page);

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
