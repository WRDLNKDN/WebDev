import type { Page } from '@playwright/test';
import { getStubSession, USER_ID } from './auth';

// Stub auth token (refresh) so client doesn't clear session on refresh
async function stubAuthToken(page: Page) {
  const session = getStubSession();
  await page.route('**/auth/v1/token**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });
}

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
  // Register baseline routes; tests can add more specific handlers later.
  // Playwright runs the most recently registered matching route first.
  await stubAuthToken(page);

  // Broad REST fallback first so endpoint-specific stubs below take precedence.
  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (method !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.includes('profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([STUB_PROFILE]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
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

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith('/api/')) {
      await route.fallback();
      return;
    }
    if (pathname === '/api/advertise/request') {
      await route.fallback();
      return;
    }
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
}
