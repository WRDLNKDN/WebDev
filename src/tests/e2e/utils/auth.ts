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
import { FIXTURE_PROFILES, FIXTURE_USER_ID } from './authFixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const USER_ID = FIXTURE_USER_ID;

const ACCESS_TOKEN = 'stub-access-token';
const REFRESH_TOKEN = 'stub-refresh-token';

function resolveAuthStorageKey(): string {
  const appEnv = (process.env.VITE_APP_ENV ?? '').trim().toLowerCase();
  const envPrefix =
    appEnv === 'uat'
      ? 'uat-'
      : appEnv === 'production' || appEnv === 'prod'
        ? 'prod-'
        : 'dev-';
  return `${envPrefix}sb-wrdlnkdn-auth`;
}

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

  const storageKey = resolveAuthStorageKey();

  // Inject session into localStorage before any page loads
  await context.addInitScript(
    ({ s, r, authKey }) => {
      (s as Record<string, unknown>).user = {
        ...((s as Record<string, unknown>).user as object),
        role: r,
      };

      const serialized = JSON.stringify(s);
      localStorage.setItem(authKey, serialized);

      // Legacy and fallback keys used by older tests/clients.
      const legacyKey = `sb-${location.hostname}-auth-token`;
      localStorage.setItem(legacyKey, serialized);

      const discovered = Object.keys(localStorage).find(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
      );
      if (discovered) {
        localStorage.setItem(discovered, serialized);
      }
    },
    { s: session, r: role, authKey: storageKey },
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
  const storageKey = resolveAuthStorageKey();
  const profile =
    FIXTURE_PROFILES[fixture] ?? FIXTURE_PROFILES['test-user-with-links'];
  const session = getStubSession();
  const buildProfilesBody = (acceptHeader: string | undefined) => {
    const wantsSingleObject = Boolean(
      acceptHeader?.includes('application/vnd.pgrst.object+json'),
    );
    return wantsSingleObject
      ? JSON.stringify(profile)
      : JSON.stringify([profile]);
  };

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
    const accept = route.request().headers()['accept'];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: buildProfilesBody(accept),
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
  await page.addInitScript(
    ({ s, authKey }) => {
      try {
        const serialized = JSON.stringify(s);

        localStorage.setItem(authKey, serialized);

        // Supabase stores the key as sb-<project-ref>-auth-token; using a
        // wildcard key prefix covers any project ref in any environment
        const existing = Object.keys(localStorage).find(
          (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
        );
        const key = existing ?? 'sb-stub-auth-token';
        localStorage.setItem(key, serialized);
      } catch {
        // localStorage may not be available in some contexts
      }
    },
    { s: session, authKey: storageKey },
  );
}
