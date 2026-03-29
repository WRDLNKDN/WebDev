import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard edit profile unsaved changes', () => {
  test('warns before closing the edit profile dialog with unsaved changes', async ({
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

    const profileMenuButton = page.getByRole('button', {
      name: /manage profile/i,
    });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click({ force: true });
    await page.getByRole('menuitem', { name: /edit profile/i }).click();

    const dialog = page.getByRole('dialog', { name: /edit.*profile/i });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Bio').fill('Dirty profile change');
    await dialog.getByRole('button', { name: 'Close' }).click();

    const unsavedDialog = page.getByRole('dialog', {
      name: /unsaved changes/i,
    });
    await expect(unsavedDialog).toBeVisible();
    await expect(
      unsavedDialog.getByText(
        'You have unsaved profile changes. Save before closing?',
      ),
    ).toBeVisible();

    await unsavedDialog
      .getByRole('button', { name: 'Continue Editing' })
      .click();
    await expect(unsavedDialog).toBeHidden();
    await expect(dialog).toBeVisible();
  });
});
