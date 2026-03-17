import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe.configure({ timeout: 90_000 });

async function chooseDialogSelectOption(
  page: import('@playwright/test').Page,
  dialog: import('@playwright/test').Locator,
  label: 'Category' | 'Platform',
  optionName: string,
) {
  const select = dialog.getByLabel(label);
  await expect(select).toBeVisible();
  await select.click({ force: true });

  const option = page.getByRole('option', { name: optionName, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(option).toBeHidden();
}

test.describe('Issue #609 - Edit Links modal grouping and alpha order', () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 45_000 });

    const linksSection = page.getByTestId('dashboard-links-section');
    await expect(linksSection).toBeVisible({ timeout: 45_000 });
    await linksSection.getByRole('button', { name: /add links/i }).click();
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

    await chooseDialogSelectOption(page, dialog, 'Platform', 'Behance');
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

  test('unsaved changes prompt appears after adding a link without saving', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });

    await chooseDialogSelectOption(page, dialog, 'Platform', 'Behance');
    await dialog
      .getByPlaceholder(/https:\/\/example\.com/i)
      .fill('https://behance.net/unsaved-link');
    await dialog.getByRole('button', { name: /\+ add to list/i }).click();

    await dialog.getByRole('button', { name: /close/i }).click();

    await expect(
      page.getByRole('dialog', { name: /unsaved changes/i }),
    ).toBeVisible();
  });

  test('Games category shows game platforms with Other as option', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', { name: /manage links/i });
    await chooseDialogSelectOption(page, dialog, 'Category', 'Games');

    await dialog.getByLabel('Platform').click({ force: true });
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible({ timeout: 5000 });
    const labels = await options.allTextContents();

    const expected = [
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
    ];
    expect(labels).toHaveLength(expected.length);
    expect(new Set(labels)).toEqual(new Set(expected));
    expect(labels).toContain('Other');
  });
});
