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
      user_metadata: { handle: 'member', full_name: 'Member' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSessionAndJoinState(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
    window.localStorage.setItem(
      'wrdlnkdn-join-state',
      JSON.stringify({
        currentStep: 'profile',
        completedSteps: ['welcome', 'identity', 'values'],
        identity: {
          provider: 'google',
          userId: session.user.id,
          email: session.user.email,
          termsAccepted: true,
          guidelinesAccepted: true,
          policyVersion: 'v1',
          timestamp: new Date().toISOString(),
        },
        values: {
          joinReason: ['Build meaningful connections'],
          participationStyle: ['Share projects and resources'],
        },
        profile: null,
      }),
    );
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

test.describe('Join completion landing', () => {
  test('final submit lands directly on feed', async ({ page }) => {
    await seedSignedInSessionAndJoinState(page);

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const select = url.searchParams.get('select') ?? '';

      if (req.method() === 'GET' && select.includes('feed_view_preference')) {
        await fulfillPostgrest(route, [{ feed_view_preference: 'anyone' }]);
        return;
      }

      if (req.method() === 'GET' && select.includes('display_name')) {
        await fulfillPostgrest(route, [
          {
            display_name: null,
            tagline: null,
            join_reason: ['Build meaningful connections'],
            participation_style: ['Share projects and resources'],
            additional_context: null,
            policy_version: 'v1',
            marketing_opt_in: false,
            marketing_source: null,
          },
        ]);
        return;
      }

      if (req.method() === 'GET' && select.includes('id,handle')) {
        await fulfillPostgrest(route, [{ id: USER_ID, handle: 'member' }]);
        return;
      }

      if (req.method() === 'PATCH') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: '',
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await page.route('**/api/feeds**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'post-1',
              user_id: USER_ID,
              kind: 'post',
              payload: { body: 'Welcome post' },
              parent_id: null,
              created_at: new Date().toISOString(),
              edited_at: null,
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
              comment_count: 0,
            },
          ],
          nextCursor: null,
        }),
      });
    });

    await page.goto('/join');
    await expect(
      page.getByRole('heading', { name: 'Create your public profile' }),
    ).toBeVisible();

    await page.getByLabel('Public display name').fill('Member Test');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/feed/);
  });

  test('feed join completion message shows once for join query param', async ({
    page,
  }) => {
    await seedSignedInSessionAndJoinState(page);
    await page.addInitScript(() => {
      window.sessionStorage.setItem('wrdlnkdn-join-complete-flash', '1');
    });

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });

    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'false',
      });
    });

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

    await page.route('**/api/feeds**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'post-1',
              user_id: USER_ID,
              kind: 'post',
              payload: { body: 'Welcome post' },
              parent_id: null,
              created_at: new Date().toISOString(),
              edited_at: null,
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
              comment_count: 0,
            },
          ],
          nextCursor: null,
        }),
      });
    });

    await page.goto('/feed?join=complete');
    await expect(
      page.getByText('Join complete. Welcome to the Feed.'),
    ).toBeVisible();

    await expect(page).toHaveURL(/\/feed/);
    await page.reload();
    await expect(page).toHaveURL(/\/feed/);
    await expect(
      page.getByText('Join complete. Welcome to the Feed.'),
    ).not.toBeVisible();
  });
});
