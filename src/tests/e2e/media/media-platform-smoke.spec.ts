import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { fulfillPostgrest } from '../utils/postgrestFulfill';
import { stubAppSurface } from '../utils/stubAppSurface';

const INLINE_MEDIA_DATA_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#0f172a"/><rect x="90" y="90" width="1420" height="720" rx="40" fill="#1d4ed8"/><text x="160" y="250" fill="#eff6ff" font-family="Arial, sans-serif" font-size="82" font-weight="700">Shared media smoke</text><text x="160" y="350" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="42">Landscape asset used by feed and groups.</text></svg>`,
  );

async function gotoWithChunkRetry(
  page: import('@playwright/test').Page,
  url: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 0) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } else {
      const reloadButton = page.getByRole('button', { name: 'Reload page' });
      if (await reloadButton.isVisible().catch(() => false)) {
        await reloadButton.click();
        await page.waitForLoadState('domcontentloaded');
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
    }

    const errorHeading = page.getByRole('heading', {
      name: 'Something went wrong loading this page',
    });
    if (!(await errorHeading.isVisible().catch(() => false))) {
      return;
    }
  }
}

test.describe('Media platform smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('groups renders shared group media cards without falling back to an error state', async ({
    page,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);

    const roomId = 'group-room-1';

    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      const url = route.request().url();
      if (url.includes('select=room_id') || url.includes('user_id=eq.')) {
        await fulfillPostgrest(route, [
          { room_id: roomId, user_id: USER_ID, left_at: null },
        ]);
        return;
      }
      await fulfillPostgrest(route, [
        {
          room_id: roomId,
          user_id: USER_ID,
          role: 'admin',
          joined_at: '2026-04-01T12:00:00.000Z',
          left_at: null,
        },
      ]);
    });

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: roomId,
          room_type: 'group',
          name: 'Media Ops Group',
          description: 'Shared media smoke room',
          image_url: INLINE_MEDIA_DATA_URL,
          created_by: USER_ID,
          created_at: '2026-04-01T12:00:00.000Z',
          updated_at: '2026-04-01T12:10:00.000Z',
          last_message_preview: 'Shared media rollout looks good.',
          last_message_at: '2026-04-01T12:10:00.000Z',
          unread_count: 2,
        },
      ]);
    });

    await page.route('**/rest/v1/chat_room_preferences*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/chat_blocks*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'Member',
          avatar: null,
        },
      ]);
    });

    await page.route('**/rest/v1/rpc/chat_room_summaries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            room_id: roomId,
            last_content: 'Shared media rollout looks good.',
            last_created_at: '2026-04-01T12:10:00.000Z',
            last_is_deleted: false,
            unread_count: 2,
          },
        ]),
      });
    });

    await gotoWithChunkRetry(page, '/groups');
    await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Media Ops Group')).toBeVisible();
    await expect(page.getByText('2 unread')).toBeVisible();
    await expect(page.getByAltText('Media Ops Group')).toBeVisible();
  });
});
