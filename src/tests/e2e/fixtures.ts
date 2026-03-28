import { test as base } from '@playwright/test';

/**
 * E2E fixtures: stub common API calls so the app doesn't hit the proxy when the
 * backend isn't running (e.g. CI or `playwright test` with only Vite). This
 * prevents "[vite] http proxy error ... ECONNREFUSED 127.0.0.1:3001" noise.
 */
export const test = base.extend({
  page: async ({ page }, runWithPage) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });
    await page.route('**/api/auth/callback-log', async (route) => {
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
    await page.route('**/rest/v1/feature_flags*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { key: 'coming_soon', enabled: true },
          { key: 'store', enabled: true },
        ]),
      });
    });
    await runWithPage(page);
  },
});

export { expect } from '@playwright/test';
export type { Page, Route } from '@playwright/test';
