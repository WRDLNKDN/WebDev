import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function mockSessionPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'member@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle: 'member' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSession(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
  }, payload);
}

async function fulfillPostgrest(route: Route, rowOrRows: unknown) {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(
      isSingle && Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows,
    ),
  });
}

test.describe('Signed-in auth resilience + GIF flow', () => {
  test('signed-in member can connect without false unauthorized', async ({
    page,
  }) => {
    await seedSignedInSession(page);

    let connectedRequested = false;

    await page.route('**/rest/v1/profiles*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          display_name: 'Member',
          join_reason: ['networking'],
          participation_style: ['builder'],
          policy_version: '1.0',
        },
      ]);
    });

    await page.route('**/api/directory**', async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      if (method === 'GET' && url.pathname === '/api/directory') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: OTHER_ID,
                handle: 'other-member',
                display_name: 'Other Member',
                avatar: null,
                tagline: 'Building together',
                pronouns: null,
                industry: 'Tech',
                location: 'Austin',
                skills: ['react'],
                bio_snippet: 'Hello there',
                connection_state: connectedRequested
                  ? 'pending'
                  : 'not_connected',
                use_weirdling_avatar: false,
              },
            ],
            hasMore: false,
          }),
        });
        return;
      }

      if (method === 'POST' && url.pathname === '/api/directory/connect') {
        connectedRequested = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/directory');
    await expect(page).toHaveURL(/\/directory/);
    await page.getByRole('button', { name: /connect/i }).click();

    await expect(page.getByText('You need to sign in to do that.')).toHaveCount(
      0,
    );
    await expect(page.getByText('Awaiting approval')).toBeVisible();
  });

  test('signed-in member can search and attach GIF in chat composer', async ({
    page,
  }) => {
    await seedSignedInSession(page);

    await page.route('**/rest/v1/profiles*', async (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.includes('select=display_name%2Cjoin_reason')) {
        await fulfillPostgrest(route, [
          {
            id: USER_ID,
            display_name: 'Member',
            join_reason: ['networking'],
            participation_style: ['builder'],
            policy_version: '1.0',
          },
        ]);
        return;
      }
      await fulfillPostgrest(route, [
        { id: USER_ID, handle: 'member', display_name: 'Member', avatar: null },
        {
          id: OTHER_ID,
          handle: 'friend',
          display_name: 'Friend',
          avatar: null,
        },
      ]);
    });

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      await fulfillPostgrest(route, [
        {
          id: 'room-1',
          room_type: 'dm',
          name: null,
          created_by: USER_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    });
    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await fulfillPostgrest(route, [
        {
          room_id: 'room-1',
          user_id: USER_ID,
          role: 'admin',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          room_id: 'room-1',
          user_id: OTHER_ID,
          role: 'member',
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);
    });
    await page.route('**/rest/v1/chat_messages*', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillPostgrest(route, [
          {
            id: 'msg-1',
            room_id: 'room-1',
            sender_id: USER_ID,
            content: 'hello gif',
            is_system_message: false,
            is_deleted: false,
            edited_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      await fulfillPostgrest(route, []);
    });
    await page.route('**/rest/v1/chat_message_attachments*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
      });
    });
    await page.route(
      '**/storage/v1/object/chat-attachments/**',
      async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ Key: 'chat-attachments/uploaded.gif' }),
          });
          return;
        }
        await route.fallback();
      },
    );
    await page.route(
      '**/storage/v1/object/list/chat-attachments*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              name: 'uploaded.gif',
              metadata: { mimetype: 'image/gif', size: 1234 },
            },
          ]),
        });
      },
    );
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
                tinygif: {
                  url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                },
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
    await expect(page.getByLabel('Add GIF')).toBeVisible();
    await page.getByLabel('Add GIF').click();
    await expect(
      page.getByRole('dialog', { name: 'Choose a GIF' }),
    ).toBeVisible();
    await page.locator('button:has(img[alt="Party"])').first().click();

    await expect(page.getByText(/\.gif/i)).toBeVisible();
    await page.getByPlaceholder('Type a message…').fill('hello gif');
    await page.getByLabel('Send message').click();
    await expect(page.getByText(/\.gif/i)).toHaveCount(0);
  });
});
