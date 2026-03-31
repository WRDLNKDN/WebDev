import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import {
  stubE2eApiGetOkEmpty,
  stubFeatureFlagSettingsPrivacyMarketing,
  stubIsAdminRpcFalse,
  stubRestV1EmptyReadList,
} from '../utils/settingsRoutesStubs';

type ProfilePatchPayload = Record<string, unknown>;

async function stubNotificationsSettingsSurface(page: Page) {
  const profile = {
    id: USER_ID,
    handle: 'member',
    display_name: 'Member',
    status: 'approved',
    join_reason: ['networking'],
    participation_style: ['builder'],
    policy_version: '1.0',
    push_enabled: false,
    email_notifications_enabled: true,
  };

  const patches: ProfilePatchPayload[] = [];

  await stubE2eApiGetOkEmpty(page);
  await stubRestV1EmptyReadList(page);
  await stubIsAdminRpcFalse(page);
  await stubFeatureFlagSettingsPrivacyMarketing(page, true);

  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as ProfilePatchPayload;
      patches.push(payload);
      Object.assign(profile, payload);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([profile]),
      });
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });

  return { patches };
}

test.describe('Settings Notifications', () => {
  test('deep link renders and disabling email notifications PATCHes profile', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    const { patches } = await stubNotificationsSettingsSurface(page);

    await page.goto('/dashboard/settings/notifications', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByTestId('settings-notifications-heading'),
    ).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByRole('heading', { name: /delivery channels/i }),
    ).toBeVisible();

    const emailSwitch = page.getByRole('switch', {
      name: /email notifications/i,
    });
    await expect(emailSwitch).toBeChecked();
    await emailSwitch.click();

    await expect
      .poll(() => patches.some((p) => p.email_notifications_enabled === false))
      .toBe(true);
  });
});
