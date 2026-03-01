import type { Page } from '@playwright/test';
import { USER_ID } from './auth';

export async function stubAppSurface(page: Page) {
  // ---- Catch ALL API calls first ----
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Allow admin callback logs to be overridden per test
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

  // ---- Profiles stub (needed for layout boot; include skills/industry so dashboard pills render) ----
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
          industry: 'Technology',
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
}
