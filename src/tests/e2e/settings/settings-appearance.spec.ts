import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import {
  stubE2eApiGetOkEmpty,
  stubFeatureFlagSettingsPrivacyMarketing,
  stubIsAdminRpcFalse,
  stubRestV1EmptyReadList,
} from '../utils/settingsRoutesStubs';

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
      app_theme: 'dark',
    },
  };

  const themeUpdates: ThemeUpdatePayload[] = [];

  await stubE2eApiGetOkEmpty(page);
  await stubRestV1EmptyReadList(page);
  await stubIsAdminRpcFalse(page);
  await stubFeatureFlagSettingsPrivacyMarketing(page, true);

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

    // Only Light and Dark are available; Ocean and Forest removed
    await expect(page.getByRole('button', { name: /^light$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^dark$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ocean/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /forest/i })).toHaveCount(0);

    const lightButton = page.getByRole('button', { name: /^light$/i });
    await lightButton.click();

    await expect.poll(() => themeUpdates.length).toBe(1);
    expect(
      (themeUpdates[0].nerd_creds as Record<string, unknown>).app_theme,
    ).toBe('light');

    await expect(lightButton).toHaveAttribute('aria-pressed', 'true');

    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('wrdlnkdn:app-theme')),
      )
      .toBe('light');
  });

  test('respects reduced motion on theme cards', async ({ page, context }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    await stubAppearanceSettingsSurface(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/dashboard/settings/appearance', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });

    const darkButton = page.getByRole('button', { name: /^dark$/i });
    await darkButton.hover();

    const motionState = await darkButton.evaluate((element) => {
      const parseCssTimeToMs = (value: string) =>
        value
          .split(',')
          .map((part) => part.trim())
          .map((part) =>
            part.endsWith('ms')
              ? Number.parseFloat(part)
              : Number.parseFloat(part) * 1000,
          )
          .filter((value) => Number.isFinite(value));

      const styles = window.getComputedStyle(element);
      return {
        transitionMs: Math.max(
          0,
          ...parseCssTimeToMs(styles.transitionDuration),
          ...parseCssTimeToMs(styles.transitionDelay),
        ),
        transform: styles.transform,
      };
    });

    expect(motionState.transitionMs).toBeLessThanOrEqual(1);
    expect(motionState.transform).toBe('none');
  });
});
