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

test.describe('Single scrollbar regressions', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page);

    const profileRow = {
      id: USER_ID,
      handle: 'member',
      display_name: 'Member',
      avatar: null,
      status: 'approved',
      join_reason: ['networking'],
      participation_style: ['builder'],
      policy_version: '1.0',
      industry: 'Technology',
      nerd_creds: { bio: 'Member bio', skills: ['Testing'] },
      socials: [],
    };

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/api/feeds**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], nextCursor: null }),
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

    await page.route('**/rest/v1/feed_advertisers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/feed_connections*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await fulfillPostgrest(route, [profileRow]);
    });
  });

  test('feed and profile avoid nested page-height scroll containers', async ({
    page,
  }) => {
    const getOffenders = async () =>
      page.evaluate(() => {
        return [...document.querySelectorAll<HTMLElement>('*')]
          .filter((el) => {
            if (el === document.body || el === document.documentElement)
              return false;
            const style = window.getComputedStyle(el);
            if (!['auto', 'scroll'].includes(style.overflowY)) return false;
            if (el.clientHeight < window.innerHeight * 0.4) return false;
            return el.scrollHeight > el.clientHeight + 1;
          })
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            testId: el.getAttribute('data-testid'),
            className: el.className,
          }));
      });

    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed/);
    await expect(getOffenders()).resolves.toEqual([]);

    await page.goto('/profile/member');
    await expect(page).toHaveURL(/\/profile\/member/);
    await expect(getOffenders()).resolves.toEqual([]);
  });

  test('join uses only its dedicated scroll container', async ({ page }) => {
    await page.goto('/join');
    await expect(page).toHaveURL(/\/join/);

    const joinOffenders = await page.evaluate(() => {
      return [...document.querySelectorAll<HTMLElement>('*')]
        .filter((el) => {
          if (el === document.body || el === document.documentElement)
            return false;
          const style = window.getComputedStyle(el);
          if (!['auto', 'scroll'].includes(style.overflowY)) return false;
          if (el.clientHeight < window.innerHeight * 0.4) return false;
          return el.scrollHeight > el.clientHeight + 1;
        })
        .map((el) => ({
          testId: el.getAttribute('data-testid'),
        }));
    });

    expect(
      joinOffenders.every((el) => el.testId === 'join-scroll-container'),
    ).toBe(true);
  });
});
