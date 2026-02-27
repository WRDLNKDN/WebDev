import { expect, test, type Page } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function mockSessionPayload() {
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
      email: 'member@example.com',
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

async function seedSignedInSession(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
  }, payload);
}

test.describe('Auth callback timeout recovery', () => {
  test('shows timeout guidance instead of infinite spinner', async ({
    page,
  }) => {
    test.setTimeout(70_000);
    await seedSignedInSession(page);

    // Simulate stalled profile fetch so app never completes; UI timeout (30s) shows guidance.
    await page.route('**/rest/v1/profiles*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 22_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    await page.goto('/auth/callback?next=/feed');

    // AuthCallback shows message after callbackTimeoutMs (30s); allow buffer for CI.
    await expect(
      page.getByText('Sign-in is taking longer than expected.'),
    ).toBeVisible({ timeout: 45_000 });

    const copyButton = page.getByRole('button', { name: 'Copy debug info' });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(
      page.getByText(/Debug info copied\.|Could not copy automatically\./),
    ).toBeVisible();
  });
});
