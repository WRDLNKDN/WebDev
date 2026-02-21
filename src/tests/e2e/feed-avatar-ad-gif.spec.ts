import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ADVERTISERS_UPDATED_EVENT_KEY = 'feed_advertisers_updated_at';

function mockSessionPayload(overrides?: {
  userMetadata?: Record<string, unknown>;
}) {
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
      user_metadata: {
        handle: 'member',
        full_name: 'Member',
        ...(overrides?.userMetadata ?? {}),
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSession(
  page: Page,
  overrides?: { userMetadata?: Record<string, unknown> },
) {
  const payload = mockSessionPayload(overrides);
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
    window.sessionStorage.clear();
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

test.describe('Avatar, ad link refresh, and GIF URL rendering', () => {
  test('Google profile photo hydrates to navbar avatar without manual change', async ({
    page,
  }) => {
    const providerAvatar =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    let syncedAvatar: string | null = null;
    await seedSignedInSession(page, {
      userMetadata: { avatar_url: providerAvatar },
    });

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
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

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { avatar?: string };
        syncedAvatar = typeof body.avatar === 'string' ? body.avatar : null;
        await route.fulfill({ status: 204, body: '' });
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
          nerd_creds: { bio: 'Hello' },
          socials: [],
        },
      ]);
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect.poll(() => syncedAvatar).toBe(providerAvatar);
  });

  test('avatar change updates navbar avatar across site', async ({ page }) => {
    await seedSignedInSession(page);

    let avatarState: string | null = null;
    let avatarPatched = false;
    let avatarReadCalls = 0;

    await page.route('**/api/weirdling/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ weirdlings: [] }),
      });
    });

    await page.route('**/api/me/avatar', async (route) => {
      avatarReadCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: avatarState } }),
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
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

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/storage/v1/object/avatars/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: 'avatars/new-avatar.png' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { avatar?: string };
        if (typeof body.avatar === 'string' && body.avatar.trim()) {
          avatarPatched = true;
          avatarState =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'Member',
          avatar: avatarState,
          status: 'approved',
          join_reason: ['networking'],
          participation_style: ['builder'],
          policy_version: '1.0',
          nerd_creds: { bio: 'Hello' },
          socials: [],
        },
      ]);
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('header img[alt="Member"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit Profile' }).first().click();
    await page.getByRole('button', { name: /^Select Weirdling 1$/ }).click();

    await expect.poll(() => avatarPatched).toBe(true);
    await expect.poll(() => avatarReadCalls).toBeGreaterThan(1);
  });

  test('feed ad links refresh after advertiser edit signal', async ({
    page,
  }) => {
    await seedSignedInSession(page);
    let ctaLabel = 'Old CTA';

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

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
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
      await fulfillPostgrest(route, [
        {
          id: 'ad-1',
          company_name: 'Sponsor',
          title: 'Sponsor spotlight',
          description: 'Great product',
          url: 'https://example.com',
          logo_url: null,
          image_url: null,
          links: [{ label: ctaLabel, url: 'https://example.com/new' }],
          active: true,
          sort_order: 1,
        },
      ]);
    });

    await page.route(/\/api\/feeds(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      const data = Array.from({ length: 6 }).map((_, i) => ({
        id: `post-${i + 1}`,
        user_id: USER_ID,
        kind: 'post',
        payload: { body: `Post ${i + 1}` },
        parent_id: null,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        edited_at: null,
        actor: { handle: 'member', display_name: 'Member', avatar: null },
        like_count: 0,
        love_count: 0,
        inspiration_count: 0,
        care_count: 0,
        viewer_reaction: null,
        comment_count: 0,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data, nextCursor: null }),
      });
    });

    await page.goto('/feed');
    await expect(page.getByText('Old CTA')).toBeVisible();

    ctaLabel = 'New CTA';
    await page.evaluate((key) => {
      window.dispatchEvent(
        new StorageEvent('storage', { key, newValue: String(Date.now()) }),
      );
    }, ADVERTISERS_UPDATED_EVENT_KEY);

    await expect(page.getByText('New CTA')).toBeVisible();
  });

  test('GIF URL in post body renders inline once', async ({ page }) => {
    await seedSignedInSession(page);
    const gifUrl = 'https://media.example.com/reaction.gif';

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });
    await page.route('**/api/link-preview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
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
    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
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

    await page.route(/\/api\/feeds(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'post-gif',
              user_id: USER_ID,
              kind: 'post',
              payload: {
                body: `Check this out ${gifUrl}`,
                images: [gifUrl],
              },
              parent_id: null,
              created_at: new Date().toISOString(),
              edited_at: null,
              actor: { handle: 'member', display_name: 'Member', avatar: null },
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

    await page.goto('/feed');
    await expect(page.locator(`img[src="${gifUrl}"]`)).toHaveCount(1);
  });
});
