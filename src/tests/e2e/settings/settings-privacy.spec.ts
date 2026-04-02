import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import {
  SETTINGS_E2E_MEMBER_PROFILE,
  stubMutableSettingsProfileRoute,
  stubSettingsShell,
} from '../utils/settingsRoutesStubs';

type ConsentUpdatePayload = Record<string, unknown>;

async function stubPrivacySettingsSurface(
  page: Page,
  options: { privacyEnabled: boolean },
) {
  const profile = {
    ...SETTINGS_E2E_MEMBER_PROFILE,
    marketing_email_enabled: false,
    marketing_opt_in: false,
    marketing_push_enabled: false,
    consent_updated_at: null as string | null,
  };

  const consentUpdates: ConsentUpdatePayload[] = [];

  await stubSettingsShell(page, options.privacyEnabled);
  await stubMutableSettingsProfileRoute(page, profile, (payload) => {
    const isMarketingConsentUpdate =
      'marketing_email_enabled' in payload ||
      'marketing_push_enabled' in payload;
    if (isMarketingConsentUpdate) {
      consentUpdates.push(payload);
    }
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
      timeout: 45_000,
    });
    await expect(
      page.getByText('Marketing Communications', { exact: false }),
    ).toBeVisible({ timeout: 45_000 });

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
