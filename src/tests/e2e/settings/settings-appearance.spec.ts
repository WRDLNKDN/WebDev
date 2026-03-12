import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';

type ThemeUpdatePayload = Record<string, unknown>;

async function stubAppearanceSettingsSurface(page: Page) {
  const profile = {
    id: '11111111-1111-4111-8111-111111111111',
    handle: 'member',
    display_name: 'Member',
    status: 'approved',
    join_reason: ['networking'],
    participation_style: ['builder'],
    policy_version: '1.0',
    nerd_creds: {
      app_theme: 'ocean',
    },
  };

  const themeUpdates: ThemeUpdatePayload[] = [];

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
          enabled: true,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as ThemeUpdatePayload;
      if ('nerd_creds' in payload) {
        themeUpdates.push(payload);
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

  return { themeUpdates };
}

test.describe('Settings Appearance', () => {
  test.describe.configure({ mode: 'serial' });

  test('applies a selected theme and persists it to profile + local storage', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    const { themeUpdates } = await stubAppearanceSettingsSurface(page);

    await page.goto('/dashboard/settings/appearance', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByRole('heading', { name: /appearance/i }),
    ).toBeVisible();

    const forestButton = page.getByRole('button', { name: /forest/i });
    await forestButton.click();

    await expect.poll(() => themeUpdates.length).toBe(1);
    expect(
      (themeUpdates[0].nerd_creds as Record<string, unknown>).app_theme,
    ).toBe('forest');

    await expect(forestButton).toHaveAttribute('aria-pressed', 'true');

    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('wrdlnkdn:app-theme')),
      )
      .toBe('forest');
  });
});
