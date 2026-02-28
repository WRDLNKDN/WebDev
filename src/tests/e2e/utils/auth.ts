import type { BrowserContext, Page } from '@playwright/test';

export const USER_ID = '11111111-1111-4111-8111-111111111111';

export async function seedSignedInSession(
  context: BrowserContext,
  {
    email = 'member@example.com',
    handle = 'member',
    isAdmin = false,
  }: {
    email?: string;
    handle?: string;
    isAdmin?: boolean;
  } = {},
) {
  const now = Math.floor(Date.now() / 1000);

  const session = {
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

  await context.addInitScript((payload) => {
    // Find actual supabase auth storage key dynamically
    const existingKeys = Object.keys(localStorage);
    const sbKey =
      existingKeys.find((k) => k.includes('sb-') && k.includes('auth')) ||
      'sb-e2e-auth';

    localStorage.setItem(sbKey, JSON.stringify(payload));
  }, session);

  return {
    stubAdminRpc: async (page: Page) => {
      await page.route('**/rest/v1/rpc/is_admin', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(isAdmin),
        });
      });
    },
  };
}
