import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard share profile modal', () => {
  test('removes the inline panel and exposes share actions from the profile menu', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);

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
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    await expect(page.getByText(/^share my profile$/i)).toHaveCount(0);

    const profileMenuButton = page.getByRole('button', {
      name: /manage profile/i,
    });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click({ force: true });
    await expect(
      page.getByRole('menuitem', { name: 'View Profile' }),
    ).toBeVisible();
    await page.getByRole('menuitem', { name: 'Share My Profile' }).click();

    const dialog = page.getByRole('dialog', { name: 'Share My Profile' });
    const expectedShareUrl = new URL(
      '/p/member-share-token',
      page.url(),
    ).toString();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Public profile URL')).toHaveValue(
      expectedShareUrl,
    );
    await expect(
      dialog.getByRole('button', { name: 'Copy link' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Regenerate link' }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('sign out from profile menu returns to the home page', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    const accountMenuButton = page.locator(
      'button[aria-label="Account menu"]:visible',
    );
    await expect(accountMenuButton).toBeEnabled({ timeout: 20_000 });
    await accountMenuButton.click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test('share modal shows a friendly error when share token RPC is unavailable', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.route(
      '**/rest/v1/rpc/get_or_create_profile_share_token*',
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST301',
            message: 'RPC not found',
          }),
        });
      },
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    const profileMenuButton = page.getByRole('button', {
      name: /manage profile/i,
    });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click({ force: true });
    await page.getByRole('menuitem', { name: 'Share My Profile' }).click();

    const dialog = page.getByRole('dialog', { name: 'Share My Profile' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "Share link isn't available right now. Please try again later.",
      ),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copy link' })).toHaveCount(
      0,
    );
  });
});
