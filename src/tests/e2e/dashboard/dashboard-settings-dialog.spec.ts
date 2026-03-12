import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard dialog dismissal', () => {
  test.beforeEach(async ({ page, context }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
  });

  test('edit profile closes with Escape and returns to a usable opener state', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });

    const profileMenuButton = page.getByRole('button', {
      name: 'Profile menu',
    });
    await expect(profileMenuButton).toBeVisible({ timeout: 20_000 });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click();

    await page.getByRole('menuitem', { name: /edit profile/i }).click();

    const dialog = page.getByRole('dialog', { name: /edit.*profile/i });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible();
    await expect(profileMenuButton).toBeVisible();
    await expect(profileMenuButton).toBeEnabled();
  });
});
