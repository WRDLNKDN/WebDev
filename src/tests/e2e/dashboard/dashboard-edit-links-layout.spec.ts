import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe.configure({ timeout: 90_000 });

test.describe('Issue #609 - Edit Links modal grouping and alpha order', () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 45_000 });

    const profileButton = page.getByRole('button', { name: /profile/i });
    await expect(profileButton).toBeVisible({ timeout: 45_000 });
    await expect(profileButton).toBeEnabled({ timeout: 45_000 });
    await profileButton.click();
    await page.getByRole('menuitem', { name: /add or edit links/i }).click();
    await expect(
      page.getByRole('dialog', { name: /manage links/i }),
    ).toBeVisible();
  });

  test('CURRENT LINKS section is grouped by category', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });
    await expect(
      dialog.getByTestId('edit-link-group-Professional'),
    ).toBeVisible();
    await expect(dialog.getByTestId('edit-link-group-Social')).toBeVisible();
  });

  test('links within each category are alphabetized in Edit Links', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });
    const profGroup = dialog.getByTestId('edit-link-group-Professional');
    const linkLabels = await profGroup
      .getByTestId('edit-link-label')
      .allTextContents();

    const sorted = [...linkLabels].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkLabels).toEqual(sorted);
  });

  test('adding a new link places it in the correct alphabetical position', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });

    await dialog.getByRole('combobox', { name: /platform/i }).click();
    await page.getByRole('option', { name: 'Behance' }).click();
    await dialog
      .getByPlaceholder(/https:\/\/example\.com/i)
      .fill('https://behance.net/testuser');
    await dialog.getByRole('button', { name: /\+ add to list/i }).click();

    const profGroup = dialog.getByTestId('edit-link-group-Professional');
    const linkLabels = await profGroup
      .getByTestId('edit-link-label')
      .allTextContents();

    const sorted = [...linkLabels].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkLabels).toEqual(sorted);
  });

  test('modal close behavior stays unchanged', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });
    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('unsaved changes prompt appears when closing dirty form', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });

    await dialog
      .getByPlaceholder(/https:\/\/example\.com/i)
      .fill('https://example.org/dirty');
    await dialog.getByRole('button', { name: /close/i }).click();

    await expect(
      page.getByRole('dialog', { name: /unsaved changes/i }),
    ).toBeVisible();
  });

  test('Games category shows the expected platform list with Other last', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });
    await dialog.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: 'Games' }).click();

    await dialog.getByRole('combobox', { name: /platform/i }).click();
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
    const labels = await options.allTextContents();

    expect(labels).toEqual([
      'Select platform',
      'Armor Games',
      'Epic Games Store',
      'Game Jolt',
      'GitHub (Game Repo)',
      'itch.io',
      'Kongregate',
      'Newgrounds',
      'Nintendo eShop',
      'PlayStation Store',
      'Roblox',
      'Steam',
      'Unity Play',
      'Web Browser (Playable Web Game)',
      'Xbox / Microsoft Store',
      'Other',
    ]);
  });
});
