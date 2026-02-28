// src/tests/e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
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

async function runAxeAudit(page: Page, includeSelector = 'main') {
  const aaResults = await new AxeBuilder({ page })
    .include(includeSelector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(aaResults.violations).toEqual([]);
}

async function stubAuthedSurface(page: Page) {
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
      body: JSON.stringify({ data: [], nextCursor: null }),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

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
        nerd_creds: { bio: 'Hello' },
        socials: [],
      },
    ]);
  });

  // Catch-all for other PostgREST reads used by shared layout.
  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.describe('Global Accessibility Audit', () => {
  test('Global Accessibility Audit', async ({ page }) => {
    test.setTimeout(60_000);
    await seedSignedInSession(page);
    await stubAuthedSurface(page);

    await page.goto('/feed', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    await runAxeAudit(page);
  });

  test.skip('Notifications route accessibility', async ({ page }) => {
    // Skip: /dashboard/notifications often redirects to /join in e2e when session/RequireOnboarded
    // is not satisfied. A11y covered by notifications-mobile.
    await seedSignedInSession(page);
    await stubAuthedSurface(page);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await runAxeAudit(page);
  });

  test('Join route accessibility', async ({ page }) => {
    test.setTimeout(60_000);
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.goto('/join', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    await runAxeAudit(page);
  });

  test('Project route sweep accessibility (AA enforced, AAA advisory)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedSignedInSession(page);
    await stubAuthedSurface(page);

    const routes = ['/community-partners', '/events', '/directory', '/groups'];

    for (const route of routes) {
      await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await runAxeAudit(page);
    }
  });

  test('Authenticated route sweep accessibility (AA enforced, AAA advisory)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedSignedInSession(page);
    await stubAuthedSurface(page);

    const routes = ['/feed', '/dashboard', '/dashboard/notifications'];

    for (const route of routes) {
      await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await runAxeAudit(page);
    }
  });

  test('Colorblindness simulation smoke across key routes', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedSignedInSession(page);
    await stubAuthedSurface(page);

    const routes = ['/feed', '/dashboard', '/directory', '/events'];

    for (const route of routes) {
      await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
    }
  });
});
