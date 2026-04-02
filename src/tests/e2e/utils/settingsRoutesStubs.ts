import type { Page } from '@playwright/test';

export const SETTINGS_E2E_MEMBER_PROFILE: Record<string, unknown> = {
  id: '11111111-1111-4111-8111-111111111111',
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
};

/** GET → empty JSON array; other methods → 204 (broad Supabase REST fallback). */
export async function stubRestV1EmptyReadList(page: Page): Promise<void> {
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
}

export async function stubIsAdminRpcFalse(page: Page): Promise<void> {
  await page.route('**/rest/v1/rpc/is_admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(false),
    });
  });
}

export async function stubFeatureFlagSettingsPrivacyMarketing(
  page: Page,
  enabled: boolean,
): Promise<void> {
  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          key: 'settings_privacy_marketing_consent',
          enabled,
        },
      ]),
    });
  });
}

export async function stubSettingsShell(
  page: Page,
  privacyMarketingEnabled: boolean,
): Promise<void> {
  await stubE2eApiGetOkEmpty(page);
  await stubRestV1EmptyReadList(page);
  await stubIsAdminRpcFalse(page);
  await stubFeatureFlagSettingsPrivacyMarketing(page, privacyMarketingEnabled);
}

export async function stubMutableSettingsProfileRoute(
  page: Page,
  profile: Record<string, unknown>,
  onPatch?: (payload: Record<string, unknown>) => void,
): Promise<void> {
  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      onPatch?.(payload);
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
}

export async function stubE2eApiGetOkEmpty(page: Page): Promise<void> {
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
}
