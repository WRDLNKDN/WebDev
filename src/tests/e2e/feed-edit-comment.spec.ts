import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

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

test.describe('Feed post/comment edit persistence', () => {
  test('author can edit post and comment with Edited persisting after reload', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await seedSignedInSession(page);

    const postState = {
      id: 'post-1',
      body: 'Original post body',
      edited_at: null as string | null,
      created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    };
    const commentState = {
      id: 'comment-1',
      body: 'Original comment body',
      edited_at: null as string | null,
      created_at: new Date('2026-01-01T00:05:00.000Z').toISOString(),
    };

    await page.route('**/rest/v1/profiles*', async (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.includes('select=feed_view_preference')) {
        await fulfillPostgrest(route, [{ feed_view_preference: 'anyone' }]);
        return;
      }
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'Member',
          avatar: null,
          status: 'approved',
          join_reason: ['networking'],
          participation_style: ['builder'],
          policy_version: '1.0',
        },
      ]);
    });

    await page.route('**/rest/v1/feed_advertisers*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ avatarUrl: null }),
      });
    });

    await page.route('**/api/feeds**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (method === 'GET' && url.pathname === '/api/feeds') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: postState.id,
                user_id: USER_ID,
                kind: 'post',
                payload: { body: postState.body },
                parent_id: null,
                created_at: postState.created_at,
                edited_at: postState.edited_at,
                actor: {
                  handle: 'member',
                  display_name: 'Member',
                  avatar: null,
                },
                like_count: 0,
                love_count: 0,
                inspiration_count: 0,
                care_count: 0,
                viewer_reaction: null,
                comment_count: 1,
              },
            ],
          }),
        });
        return;
      }
      if (
        method === 'PATCH' &&
        url.pathname === `/api/feeds/items/${postState.id}`
      ) {
        const body = route.request().postDataJSON() as { body?: string };
        postState.body = String(body.body ?? '').trim();
        postState.edited_at = new Date().toISOString();
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.fallback();
    });

    await page.route(
      `**/api/feeds/items/${postState.id}/comments`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: commentState.id,
                user_id: USER_ID,
                body: commentState.body,
                created_at: commentState.created_at,
                edited_at: commentState.edited_at,
                like_count: 0,
                love_count: 0,
                inspiration_count: 0,
                care_count: 0,
                viewer_reaction: null,
                actor: {
                  handle: 'member',
                  display_name: 'Member',
                  avatar: null,
                },
              },
            ],
          }),
        });
      },
    );

    await page.route(
      `**/api/feeds/comments/${commentState.id}`,
      async (route) => {
        if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON() as { body?: string };
          commentState.body = String(body.body ?? '').trim();
          commentState.edited_at = new Date().toISOString();
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await route.fallback();
      },
    );

    const initialFeedResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/feeds'),
      { timeout: 30000 },
    );
    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed/, { timeout: 30000 });
    await initialFeedResponse;
    await expect(page.getByText('Original post body')).toBeVisible({
      timeout: 30000,
    });

    await page.getByRole('button', { name: 'Edit' }).first().click();
    const postEditor = page.locator('textarea').first();
    await postEditor.fill('Updated post body');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(page.getByText('Updated post body')).toBeVisible();

    await page
      .getByRole('button', { name: /^Comment/ })
      .first()
      .click();
    await expect(page.getByText('Original comment body')).toBeVisible();

    const commentRow = page
      .locator('li')
      .filter({ hasText: 'Original comment body' });
    await commentRow.getByRole('button', { name: 'Edit' }).click();
    const commentEditor = page.locator('textarea:visible').last();
    await commentEditor.fill('Updated comment body');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(page.getByText('Updated comment body')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Updated post body')).toBeVisible();
    await expect(page.getByText(/Edited/)).toHaveCount(1);

    await page
      .getByRole('button', { name: /^Comment/ })
      .first()
      .click();
    await expect(page.getByText('Updated comment body')).toBeVisible();
    await expect(page.getByText(/Edited/)).toHaveCount(2);
  });
});
