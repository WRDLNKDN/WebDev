import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from './fixtures';
import { seedSignedInSession, USER_ID } from './utils/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FIXTURE = path.join(__dirname, 'fixtures', 'upload-sample.txt');

const E2E_ROOM_ID = 'e2e-room-1111-4111-8111-111111111111';

test.describe('Chat file upload', () => {
  test('attach file: input accepts file and send button enables (no permanent upload spinner)', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      const isSingle = route
        .request()
        .headers()
        ['accept']?.includes('application/vnd.pgrst.object+json');
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    await page.route('**/storage/v1/object/**', async (route) => {
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible({
      timeout: 25_000,
    });

    const fileInput = page.locator('input[type=file]').first();
    await fileInput.setInputFiles(UPLOAD_FIXTURE);

    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeEnabled({ timeout: 15_000 });
  });
});
