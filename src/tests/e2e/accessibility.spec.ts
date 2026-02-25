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
      user_metadata: {
        handle: 'member',
        full_name: 'Member',
      },
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

async function runAxeAudit(page: Page, includeSelector = '#root') {
  const aaResults = await new AxeBuilder({ page })
    .include(includeSelector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(aaResults.violations).toEqual([]);

  const aaaResults = await new AxeBuilder({ page })
    .include(includeSelector)
    .withTags(['wcag2aaa', 'wcag21aaa', 'wcag22aaa'])
    .analyze();
  if (aaaResults.violations.length > 0) {
    const ids = aaaResults.violations.map((v) => v.id).join(', ');
    console.info(
      `[A11Y][AAA advisory] ${aaaResults.violations.length} violation groups on ${page.url()} :: ${ids}`,
    );
    aaaResults.violations.forEach((violation) => {
      const nodeTargets = violation.nodes
        .slice(0, 6)
        .map((node) => node.target.join(' > '))
        .join(' | ');
      console.info(`[A11Y][AAA details] ${violation.id}: ${nodeTargets}`);
    });
  }
}

async function stubAvatar(page: Page) {
  await page.route('**/api/me/avatar', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
    });
  });
}

async function stubAuthedSurface(page: Page, isAdmin = false) {
  await stubAvatar(page);

  await page.route('**/rest/v1/rpc/is_admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isAdmin),
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
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
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

  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
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
            id: 'post-a11y',
            user_id: USER_ID,
            kind: 'post',
            payload: { body: 'Accessibility regression check post' },
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
}

test('Global Accessibility Audit', async ({ page }) => {
  test.setTimeout(60000);
  await stubAvatar(page);
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();

  await expect(page.getByTestId('signed-out-landing')).toBeVisible({
    timeout: 15000,
  });

  const joinLink = page.getByRole('link', { name: /Join/i }).first();
  const joinButton = page.getByRole('button', { name: /Join/i }).first();
  await expect(joinLink.or(joinButton)).toBeVisible();
  await page.waitForLoadState('networkidle');

  await runAxeAudit(page, 'main');
});

test('Notifications route accessibility', async ({ page }) => {
  await stubAvatar(page);
  await page.goto('/dashboard/notifications');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
  await runAxeAudit(page);
});

test('Join route accessibility', async ({ page }) => {
  await stubAvatar(page);
  await page.goto('/join');
  await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await runAxeAudit(page, 'main');
});

test('Project route sweep accessibility (AA enforced, AAA advisory)', async ({
  page,
}) => {
  test.setTimeout(180000);
  const publicRoutes = [
    '/',
    '/join',
    '/about',
    '/platform',
    '/help',
    '/community-partners',
    '/terms',
    '/privacy',
    '/guidelines',
  ];

  await stubAvatar(page);
  for (const routePath of publicRoutes) {
    await page.goto(routePath);
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await runAxeAudit(page, 'main');
  }
});

test('Authenticated route sweep accessibility (AA enforced, AAA advisory)', async ({
  page,
}) => {
  test.setTimeout(240000);
  const memberRoutes = [
    '/feed',
    '/directory',
    '/dashboard',
    '/dashboard/notifications',
    '/events',
    '/groups',
    '/saved',
    '/chat-full',
  ];

  await seedSignedInSession(page);
  await stubAuthedSurface(page, false);
  for (const routePath of memberRoutes) {
    await page.goto(routePath);
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await runAxeAudit(page, 'main');
  }
});

test('Colorblindness simulation smoke across key routes', async ({ page }) => {
  test.setTimeout(180000);
  await seedSignedInSession(page);
  await stubAuthedSurface(page, false);
  const cdp = await page.context().newCDPSession(page);
  const simulations = [
    'deuteranopia',
    'protanopia',
    'tritanopia',
    'achromatopsia',
  ] as const;
  const routes = ['/', '/join', '/feed', '/dashboard'];

  for (const simulation of simulations) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', {
      type: simulation,
    });
    for (const routePath of routes) {
      await page.goto(routePath);
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await runAxeAudit(page, 'main');
    }
  }

  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' });
});
