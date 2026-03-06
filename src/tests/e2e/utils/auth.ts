import type { BrowserContext, Page } from '@playwright/test';

export const USER_ID = '11111111-1111-4111-8111-111111111111';

export function getStubSession(
  opts: {
    email?: string;
    handle?: string;
  } = {},
) {
  const { email = 'member@example.com', handle = 'member' } = opts;
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
      email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export async function seedSignedInSession(
  context: BrowserContext,
  opts: {
    email?: string;
    handle?: string;
    isAdmin?: boolean;
  } = {},
) {
  const { isAdmin = false } = opts;
  const session = getStubSession(opts);

  await context.addInitScript((payload) => {
    const sessionStr = JSON.stringify(payload);
    const keys = [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ];
    keys.forEach((key) => localStorage.setItem(key, sessionStr));
  }, session);

  return {
    stubAdminRpc: (p: Page) => stubAdminRpc(p, isAdmin),
  };
}

/** Stub is_admin RPC so Navbar/guards treat the user as (non-)admin. Use with or without seedSignedInSession. */
export async function stubAdminRpc(page: Page, isAdmin = false): Promise<void> {
  await page.route('**/rest/v1/rpc/is_admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isAdmin),
    });
  });
}
