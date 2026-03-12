import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

async function stubSettingsSurface(
  page: Page,
  options: { privacyEnabled: boolean },
) {
  const profile = {
    id: '11111111-1111-4111-8111-111111111111',
    handle: 'member',
    display_name: 'Member',
    status: 'approved',
    join_reason: ['networking'],
    participation_style: ['builder'],
    policy_version: '1.0',
    marketing_email_enabled: false,
    marketing_opt_in: false,
    marketing_push_enabled: false,
    push_enabled: false,
    email_notifications_enabled: true,
  };

  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
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

  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          key: 'settings_privacy_marketing_consent',
          enabled: options.privacyEnabled,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

/**
 * Project route sweep accessibility (WCAG 2a/2aa/21aa).
 * Referenced in docs/accessibility/AAA_BACKLOG.md and AGENTIC_PROTOCOL.
 */
/** Routes outside Layout (e.g. /join) use a different main container testid. */
const PUBLIC_MAIN_SELECTOR: Record<string, string> = {
  '/join': 'join-scroll-container',
};
const DEFAULT_MAIN_SELECTOR = 'app-main';

test.describe('Accessibility - route sweep (public)', () => {
  const publicRoutes = [
    { path: '/', name: 'Landing' },
    { path: '/join', name: 'Join' },
    { path: '/about', name: 'About' },
    { path: '/terms', name: 'Terms' },
    { path: '/admin', name: 'Admin gate' },
  ];

  for (const { path, name } of publicRoutes) {
    test(`${name} (${path}) has no WCAG 2a/2aa/21aa violations`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      // Join is lazy-loaded; wait for load so the chunk is fetched before asserting
      const waitUntil = path === '/join' ? 'load' : 'domcontentloaded';
      await page.goto(path, { waitUntil });
      const mainTestId = PUBLIC_MAIN_SELECTOR[path] ?? DEFAULT_MAIN_SELECTOR;
      await expect(page.getByTestId(mainTestId)).toBeVisible({
        timeout: 45_000,
      });

      const results = await new AxeBuilder({ page })
        .include(`[data-testid="${mainTestId}"]`)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Accessibility - route sweep (authenticated)', () => {
  const authRoutes = [
    { path: '/feed', name: 'Feed' },
    { path: '/directory', name: 'Directory' },
    {
      path: '/dashboard/settings/notifications',
      name: 'Settings notifications',
    },
    { path: '/dashboard/settings/privacy', name: 'Settings privacy' },
  ];

  for (const { path, name } of authRoutes) {
    test(`${name} (${path}) has no WCAG 2a/2aa/21aa violations`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(page.context());
      await stubAdminRpc(page);
      await stubAppSurface(page);
      if (path.startsWith('/dashboard/settings')) {
        await stubSettingsSurface(page, { privacyEnabled: true });
      }

      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 45_000,
      });

      const results = await new AxeBuilder({ page })
        .include('[data-testid="app-main"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
