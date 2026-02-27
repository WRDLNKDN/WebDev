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
  // Skipped: complex feed+comments mock and menu flow still flaky; re-enable when debugged.
  test.fixme(
    'author can edit post and comment with Edited persisting after reload',
    async ({ page }) => {
      test.setTimeout(120_000);
      await seedSignedInSession(page);

      const postState = {
        id: 'post-1',
        body: 'Original post body',
        edited_at: null as string | null,
        created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        deleted: false,
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

      // Register specific feed routes first (Playwright runs last-registered first).
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
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: [] }),
            });
          }
        },
      );

      // General feed handler: never fallback so we never hit real API and hang.
      await page.route('**/api/feeds**', async (route) => {
        const url = new URL(route.request().url());
        const method = route.request().method();
        if (method === 'GET' && url.pathname === '/api/feeds') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: postState.deleted
                ? []
                : [
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
          method === 'DELETE' &&
          url.pathname === `/api/feeds/items/${postState.id}`
        ) {
          postState.deleted = true;
          await route.fulfill({ status: 204, body: '' });
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
        // Unhandled feed request: fulfill with empty/404 so we never hit real backend.
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found (e2e mock)' }),
        });
      });

      await page.goto('/feed');
      await expect(page).toHaveURL(/\/feed/, { timeout: 30_000 });
      // Wait for feed list response so mock has been used and post is rendered.
      await page.waitForResponse(
        (res) =>
          res.request().method() === 'GET' &&
          res.url().includes('/api/feeds') &&
          res.url().includes('limit='),
        { timeout: 20_000 },
      );
      await expect(page.getByText('Original post body')).toBeVisible({
        timeout: 20_000,
      });

      // Edit is inside the post action menu (three-dot); open it then click Edit.
      await page.getByRole('button', { name: 'Post options' }).first().click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      const postEditor = page.locator('textarea').first();
      await postEditor.fill('Updated post body');
      await page.getByRole('button', { name: 'Save' }).first().click();
      await expect(page.getByText('Updated post body')).toBeVisible({
        timeout: 15_000,
      });

      // Expand comments (Comment button shows "Comment" or "Comment · 1").
      await page
        .getByRole('button', { name: /^Comment/ })
        .first()
        .click();
      await expect(page.getByText('Original comment body')).toBeVisible({
        timeout: 15_000,
      });

      const commentRow = page
        .locator('li')
        .filter({ hasText: 'Original comment body' });
      await commentRow.getByRole('button', { name: 'Edit' }).click();
      const commentEditor = page.locator('textarea:visible').last();
      await commentEditor.fill('Updated comment body');
      await page.getByRole('button', { name: 'Save' }).first().click();
      await expect(page.getByText('Updated comment body')).toBeVisible({
        timeout: 15_000,
      });

      await page.reload();
      await expect(page.getByText('Updated post body')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(/Edited/)).toHaveCount(1);

      await page
        .getByRole('button', { name: /^Comment/ })
        .first()
        .click();
      await expect(page.getByText('Updated comment body')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/Edited/)).toHaveCount(2);

      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Delete this post');
        await dialog.accept();
      });
      await page.getByRole('button', { name: 'Post options' }).first().click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Updated post body')).not.toBeVisible({
        timeout: 10_000,
      });
    },
  );
});
