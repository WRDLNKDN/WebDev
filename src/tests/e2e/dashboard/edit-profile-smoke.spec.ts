import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Edit Profile smoke', () => {
  test('opens Edit Profile from Dashboard, changes bio, save closes dialog', async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(context);
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.goto('/dashboard');
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('button', { name: /profile menu/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /profile menu/i }).click();
    await page.getByRole('menuitem', { name: /edit profile/i }).click();

    const dialog = page.getByRole('dialog', { name: /edit.*profile/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const bioField = dialog.getByPlaceholder('Bio');
    await expect(bioField).toBeVisible();
    await bioField.fill('E2E smoke test bio');

    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  });
});
