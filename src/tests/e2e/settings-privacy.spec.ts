import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';

type ConsentUpdatePayload = Record<string, unknown>;

async function stubPrivacySettingsSurface(
  page: Page,
  options: { privacyEnabled: boolean },
) {
  const profile = {
    id: '11111111-1111-4111-8111-111111111111',
    handle: 'member',
    display_name: 'Member',
    status: 'approved',
    join_reason: ['networking'],
    participation_style: ['builder'],
    policy_version: '1.0',
    marketing_email_enabled: false,
    marketing_opt_in: false,
    marketing_push_enabled: false,
    consent_updated_at: null as string | null,
  };

  const consentUpdates: ConsentUpdatePayload[] = [];

  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    });
  });

  // Broad fallback first; specific routes are registered below and take precedence.
  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/rest/v1/rpc/is_admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(false),
    });
  });

  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          key: 'settings_privacy_marketing_consent',
          enabled: options.privacyEnabled,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as ConsentUpdatePayload;
      const isMarketingConsentUpdate =
        'marketing_email_enabled' in payload ||
        'marketing_push_enabled' in payload;
      if (isMarketingConsentUpdate) {
        consentUpdates.push(payload);
      }
      Object.assign(profile, payload);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      });
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });

  return { consentUpdates };
}

test.describe('Settings Privacy', () => {
  test.describe.configure({ mode: 'serial' });

  test('deep link renders and consent toggles persist payload', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    const { consentUpdates } = await stubPrivacySettingsSurface(page, {
      privacyEnabled: true,
    });

    await page.goto('/dashboard/settings/privacy', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('heading', { name: /marketing communications/i }),
    ).toBeVisible({ timeout: 30_000 });

    const marketingEmailToggle = page.getByRole('switch', {
      name: /marketing emails/i,
    });
    const marketingPushToggle = page.getByRole('switch', {
      name: /marketing push notifications/i,
    });

    await expect(marketingEmailToggle).not.toBeChecked();
    await expect(marketingPushToggle).not.toBeChecked();

    await marketingEmailToggle.click();

    await expect.poll(() => consentUpdates.length).toBe(1);
    const emailUpdate = consentUpdates[0];
    expect(emailUpdate.marketing_email_enabled).toBe(true);
    expect(emailUpdate.marketing_opt_in).toBe(true);
    expect(typeof emailUpdate.consent_updated_at).toBe('string');

    await marketingPushToggle.click();

    await expect.poll(() => consentUpdates.length).toBe(2);
    const pushUpdate = consentUpdates[1];
    expect(pushUpdate.marketing_push_enabled).toBe(true);
    expect(typeof pushUpdate.consent_updated_at).toBe('string');
  });

  test('feature flag off redirects to notifications and hides privacy nav', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    await stubPrivacySettingsSurface(page, { privacyEnabled: false });

    await page.goto('/dashboard/settings/privacy', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(/\/dashboard\/settings\/notifications$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole('heading', { name: /delivery channels/i }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(
      page.locator('a[href="/dashboard/settings/privacy"]'),
    ).toHaveCount(0);
  });
});
