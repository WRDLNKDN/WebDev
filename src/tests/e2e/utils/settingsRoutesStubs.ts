import type { Page } from '@playwright/test';

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
