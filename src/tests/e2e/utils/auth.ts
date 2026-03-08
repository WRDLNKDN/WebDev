/**
 * E2E auth utilities.
 *
 * Provides stub-based session injection so specs can run without a live
 * Supabase backend (CI, `playwright test` against Vite only).
 *
 * Exports used by existing specs:
 *   - getStubSession()       → used by stubAppSurface.ts
 *   - USER_ID                → used by stubAppSurface.ts
 *   - seedSignedInSession()  → used by edit-profile-smoke.spec.ts etc.
 *
 * Export added for Issue #609 spec:
 *   - loginAs()              → stubs a signed-in session for a named fixture user
 */

import type { BrowserContext, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const USER_ID = '00000000-0000-0000-0000-000000000001';

const ACCESS_TOKEN = 'stub-access-token';
const REFRESH_TOKEN = 'stub-refresh-token';

// ---------------------------------------------------------------------------
// Stub session shape — matches Supabase GoTrue /token response
// ---------------------------------------------------------------------------

export function getStubSession(overrides?: Record<string, unknown>) {
  return {
    access_token: ACCESS_TOKEN,
    refresh_token: REFRESH_TOKEN,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: null,
      },
      app_metadata: { provider: 'email' },
      created_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixture profiles keyed by logical name
// ---------------------------------------------------------------------------

/** Links used across Profile + Dashboard fixture users */
const STUB_LINKS_PROFESSIONAL = [
  {
    id: 'link-p1',
    category: 'Professional',
    platform: 'GitHub',
    url: 'https://github.com/testuser',
    label: 'GitHub',
    isVisible: true,
    order: 2,
  },
  {
    id: 'link-p2',
    category: 'Professional',
    platform: 'LinkedIn',
    url: 'https://linkedin.com/in/testuser',
    label: 'LinkedIn',
    isVisible: true,
    order: 0,
  },
  {
    id: 'link-p3',
    category: 'Professional',
    platform: 'Stack Overflow',
    url: 'https://stackoverflow.com/users/1/testuser',
    label: 'Stack Overflow',
    isVisible: true,
    order: 1,
  },
];

const STUB_LINKS_SOCIAL = [
  {
    id: 'link-s1',
    category: 'Social',
    platform: 'Instagram',
    url: 'https://instagram.com/testuser',
    label: 'Instagram',
    isVisible: true,
    order: 1,
  },
  {
    id: 'link-s2',
    category: 'Social',
    platform: 'Discord',
    url: 'https://discord.com/testuser',
    label: 'Discord',
    isVisible: true,
    order: 0,
  },
];

const STUB_LINKS_CONTENT = [
  {
    id: 'link-c1',
    category: 'Content',
    platform: 'YouTube',
    url: 'https://youtube.com/@testuser',
    label: 'YouTube',
    isVisible: true,
    order: 1,
  },
  {
    id: 'link-c2',
    category: 'Content',
    platform: 'Blog',
    url: 'https://myblog.com',
    label: 'Blog',
    isVisible: true,
    order: 0,
  },
];

const ALL_STUB_LINKS = [
  ...STUB_LINKS_PROFESSIONAL,
  ...STUB_LINKS_SOCIAL,
  ...STUB_LINKS_CONTENT,
];

/** Base profile shape shared across fixture users */
const BASE_PROFILE = {
  id: USER_ID,
  handle: 'test-user-with-links',
  display_name: 'Test User',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: null,
  tagline: 'Test tagline',
  additional_context: '',
  nerd_creds: { skills: ['Testing'] },
  resume_url: null,
  avatar: null,
};

const FIXTURE_PROFILES: Record<string, object> = {
  /** Has Professional + Social + Content links, plus portfolio projects */
  'test-user-with-links': {
    ...BASE_PROFILE,
    handle: 'test-user-with-links',
    socials: ALL_STUB_LINKS,
  },
  /** Has links but no resume or portfolio projects */
  'test-user-links-only': {
    ...BASE_PROFILE,
    handle: 'test-user-links-only',
    socials: ALL_STUB_LINKS,
    resume_url: null,
  },
};

// ---------------------------------------------------------------------------
// seedSignedInSession — used by existing specs (edit-profile-smoke etc.)
// ---------------------------------------------------------------------------

/**
 * Seeds a signed-in Supabase session into the browser context by injecting
 * localStorage and stubbing the GoTrue /token refresh endpoint.
 *
 * Returns a `stubAdminRpc` helper that stubs Supabase RPC calls needing admin.
 */
export async function seedSignedInSession(
  context: BrowserContext,
  options: { handle?: string; isAdmin?: boolean } = {},
) {
  const session = getStubSession();
  const handle = options.handle ?? 'member';
  const role = options.isAdmin ? 'admin' : 'authenticated';

  // Inject session into localStorage before any page loads
  await context.addInitScript(
    ({ s, r }) => {
      (s as Record<string, unknown>).user = {
        ...((s as Record<string, unknown>).user as object),
        role: r,
      };
      const key = `sb-${location.hostname}-auth-token`;
      localStorage.setItem(key, JSON.stringify(s));
    },
    { s: session, r: role },
  );

  const stubAdminRpc = async (page: Page) => {
    await page.route('**/rest/v1/rpc/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });
    // Stub share token RPC specifically
    await page.route(
      '**/rest/v1/rpc/get_or_create_profile_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('stub-share-token'),
        });
      },
    );
  };

  return { session, handle, stubAdminRpc };
}

// ---------------------------------------------------------------------------
// loginAs — used by Issue #609 spec (dashboard-links-layout.spec.ts)
// ---------------------------------------------------------------------------

/**
 * Stubs a signed-in session for a named fixture user and registers profile
 * API stubs so the dashboard/profile pages render with predictable link data.
 *
 * Usage:
 *   await loginAs(page, 'test-user-with-links');
 *   await page.goto('/dashboard');
 */
export async function loginAs(page: Page, fixture: string) {
  const profile =
    FIXTURE_PROFILES[fixture] ?? FIXTURE_PROFILES['test-user-with-links'];
  const session = getStubSession();

  // Stub GoTrue token refresh
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

  // Stub GoTrue /user endpoint
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });

  // Stub profile REST endpoint with fixture data
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([profile]),
    });
  });

  // Stub share token RPC (used by Dashboard)
  await page.route(
    '**/rest/v1/rpc/get_or_create_profile_share_token*',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('stub-share-token'),
      });
    },
  );

  // Inject session into localStorage so the Supabase client considers the
  // user signed in before the page JS runs
  await page.addInitScript((s) => {
    try {
      // Supabase stores the key as sb-<project-ref>-auth-token; using a
      // wildcard key prefix covers any project ref in any environment
      const existing = Object.keys(localStorage).find(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
      );
      const key = existing ?? 'sb-stub-auth-token';
      localStorage.setItem(key, JSON.stringify(s));
    } catch {
      // localStorage may not be available in some contexts
    }
  }, session);
}
