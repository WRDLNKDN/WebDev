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

  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
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
  secondary_industry: 'Cloud Computing',
  niche_field: 'Platform Governance',
  industries: [
    {
      industry: 'Technology',
      sub_industries: ['Cloud Computing', 'Cybersecurity'],
    },
    {
      industry: 'Finance',
      sub_industries: ['FinTech'],
    },
  ],
  nerd_creds: { skills: ['Testing', 'Platform Strategy', 'DevSecOps'] },
  socials: [
    {
      id: 'p-link-1',
      category: 'Professional',
      platform: 'GitHub',
      url: 'https://github.com/testuser',
      label: 'GitHub',
      isVisible: true,
      order: 0,
    },
    {
      id: 'p-link-2',
      category: 'Professional',
      platform: 'LinkedIn',
      url: 'https://linkedin.com/in/testuser',
      label: 'LinkedIn',
      isVisible: true,
      order: 1,
    },
    {
      id: 's-link-1',
      category: 'Social',
      platform: 'Discord',
      url: 'https://discord.com/users/testuser',
      label: 'Discord',
      isVisible: true,
      order: 2,
    },
    {
      id: 'c-link-1',
      category: 'Content',
      platform: 'YouTube',
      url: 'https://youtube.com/@testuser',
      label: 'YouTube',
      isVisible: true,
      order: 3,
    },
  ],
};

export async function stubAppSurface(page: Page) {
  const buildProfilesBody = (acceptHeader: string | undefined) => {
    const wantsSingleObject = Boolean(
      acceptHeader?.includes('application/vnd.pgrst.object+json'),
    );
    return wantsSingleObject
      ? JSON.stringify(STUB_PROFILE)
      : JSON.stringify([STUB_PROFILE]);
  };

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
      const accept = route.request().headers()['accept'];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: buildProfilesBody(accept),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
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
    const accept = route.request().headers()['accept'];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: buildProfilesBody(accept),
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
      await route.fallback();
      return;
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
