import type { Page } from '@playwright/test';
import { USER_ID } from './auth';

const STUB_PROFILE = {
  id: USER_ID,
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: null,
  nerd_creds: { skills: ['Testing'] },
};

export async function stubAppSurface(page: Page) {
  // ---- Notifications (before rest catch-all so it wins) ----
  await page.route('**/rest/v1/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: '[]',
    });
  });

  // ---- Catch ALL API calls ----
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('auth-callback-logs')) {
      return route.fallback();
    }

    if (method !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  // ---- Supabase REST catch-all ----
  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method();

    if (method !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // ---- Profiles stub (RequireOnboarded, dashboard) ----
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([STUB_PROFILE]),
    });
  });

  // ---- Feature flags LAST so it wins (RequireFeatureFlag allows directory, etc.) ----
  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'directory', enabled: true },
        { key: 'events', enabled: true },
        { key: 'store', enabled: false },
        { key: 'chat', enabled: false },
      ]),
    });
  });
}
