import type { Page } from '@playwright/test';
import { USER_ID } from './auth';

export async function stubAppSurface(page: Page) {
  // ---- Profiles stub FIRST so it wins over rest/v1 catch-all (dashboard pills need industry/skills) ----
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
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
        },
      ]),
    });
  });

  // ---- Notifications ----
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

  // ---- Supabase REST catch-all (after specific routes so profiles/notifications win) ----
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
}
