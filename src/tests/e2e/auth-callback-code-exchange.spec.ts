import { expect, test, type Page } from './fixtures';

const USER_ID = '77777777-7777-4777-8777-777777777777';

function mockSessionPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'pkce-access-token',
    refresh_token: 'pkce-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'pkce@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { handle: 'member' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedPkceVerifier(page: Page) {
  await page.addInitScript(() => {
    [
      'dev-sb-wrdlnkdn-auth-code-verifier',
      'uat-sb-wrdlnkdn-auth-code-verifier',
      'prod-sb-wrdlnkdn-auth-code-verifier',
    ].forEach((key) => {
      window.localStorage.setItem(key, 'test-code-verifier/');
    });
  });
}

test.describe('Auth callback code exchange fallback', () => {
  test('exchanges OAuth code when no session exists yet', async ({ page }) => {
    test.setTimeout(60_000);

    const session = mockSessionPayload();
    await seedPkceVerifier(page);

    await page.route('**/auth/v1/token?grant_type=pkce', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
    });

    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session.user),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify({
          display_name: 'Auth Callback Member',
          join_reason: 'Build useful things',
          participation_style: 'Async',
          policy_version: '2026-01',
        }),
      });
    });

    await page.goto('/auth/callback?code=pkce-auth-code&next=/feed', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(/\/feed$/);
  });
});
