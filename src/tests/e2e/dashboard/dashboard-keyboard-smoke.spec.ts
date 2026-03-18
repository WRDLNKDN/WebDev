import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard keyboard smoke', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Dashboard keyboard smoke is kept in Chromium.',
    );
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
  });

  test('share dialog supports keyboard dismissal', async ({ page }) => {
    test.setTimeout(90_000);
    await page.route(
      '**/rest/v1/rpc/get_or_create_profile_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('member-share-token'),
        });
      },
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const menuButton = page.getByRole('button', { name: 'Profile menu' });
    await expect(menuButton).toBeVisible({ timeout: 25_000 });
    await expect(menuButton).toBeEnabled({ timeout: 25_000 });
    await menuButton.click();

    await page.getByRole('menuitem', { name: 'Share My Profile' }).click();

    const dialog = page.getByRole('dialog', { name: 'Share My Profile' });
    await expect(dialog).toBeVisible();

    const closeButton = page.getByRole('button', {
      name: 'Close share profile modal',
    });
    await expect(closeButton).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible();
    await expect(menuButton).toBeFocused();
  });

  test('industry and links groups toggle from the keyboard', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });

    const technologyGroup = page.getByRole('button', { name: 'Technology' });
    await expect(technologyGroup).toBeVisible({ timeout: 25_000 });
    await expect(technologyGroup).toHaveAttribute('aria-expanded', 'false');
    await technologyGroup.focus();
    await page.keyboard.press('Enter');
    await expect(technologyGroup).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(technologyGroup).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(technologyGroup).toHaveAttribute('aria-expanded', 'true');

    const professionalLinks = page.getByRole('button', {
      name: 'Professional links',
    });
    await expect(professionalLinks).toBeVisible();
    await professionalLinks.focus();
    await page.keyboard.press('Space');
    await expect(professionalLinks).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await expect(professionalLinks).toHaveAttribute('aria-expanded', 'true');
  });
});
