import { expect, test, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

async function fulfillPostgrest(route: Route, rowOrRows: unknown) {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: Array.isArray(rowOrRows)
      ? {
          'content-range': `0-${Math.max(rowOrRows.length - 1, 0)}/${rowOrRows.length}`,
        }
      : undefined,
    body: JSON.stringify(
      isSingle && Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows,
    ),
  });
}

test.describe('Add Project dialog UX', () => {
  test.beforeEach(async ({ page, context }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);

    const profile = {
      id: USER_ID,
      handle: 'member',
      display_name: 'Member',
      status: 'approved',
      join_reason: ['networking'],
      participation_style: ['builder'],
      policy_version: '1.0',
      industry: 'Technology and Software',
      secondary_industry: null,
      tagline: 'Builder',
      avatar: null,
      socials: [],
      nerd_creds: { skills: ['Testing'] },
      resume_url: null,
    };

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

    await page.route('**/rest/v1/profiles*', async (route) => {
      await fulfillPostgrest(route, [profile]);
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillPostgrest(route, []);
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });
  });

  const openAddProjectDialog = async (
    page: import('@playwright/test').Page,
  ) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 30_000 });

    const addMenuButton = page.getByRole('button', {
      name: /add resume or project/i,
    });
    await expect(addMenuButton).toBeVisible({ timeout: 30_000 });
    await expect(addMenuButton).toBeEnabled({ timeout: 30_000 });
    await addMenuButton.click();

    await page.getByRole('menuitem', { name: /\+ add project/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/new project/i);
    return dialog;
  };

  test('shows tooltip text when hovering form fields', async ({ page }) => {
    const dialog = await openAddProjectDialog(page);

    const nameField = dialog.getByPlaceholder('Enter project name');
    await nameField.hover();
    await expect(nameField).toHaveAttribute(
      'title',
      /internal title shown on your profile card/i,
    );

    const urlField = dialog.getByPlaceholder(
      /https:\/\/example\.com\/file\.pdf/i,
    );
    await urlField.hover();
    await expect(urlField).toHaveAttribute(
      'title',
      /public link to your artifact/i,
    );
  });

  test('aligns helper text with field edges', async ({ page }) => {
    const dialog = await openAddProjectDialog(page);

    const categoriesField = dialog.getByPlaceholder(
      'Select one or more categories',
    );
    const categoriesHelper = dialog.getByText(
      'Used to organize Portfolio Showcase sections.',
    );

    const urlField = dialog.getByPlaceholder(
      /https:\/\/example\.com\/file\.pdf/i,
    );
    const urlHelper = dialog.getByText(
      /Use any public URL \(https:\/\/ or http:\/\/\)\. We verify accessibility when saving\./i,
    );

    const categoriesFieldBox = await categoriesField.boundingBox();
    const categoriesHelperBox = await categoriesHelper.boundingBox();
    const urlFieldBox = await urlField.boundingBox();
    const urlHelperBox = await urlHelper.boundingBox();

    expect(categoriesFieldBox).not.toBeNull();
    expect(categoriesHelperBox).not.toBeNull();
    expect(urlFieldBox).not.toBeNull();
    expect(urlHelperBox).not.toBeNull();

    expect(
      Math.abs((categoriesFieldBox?.x ?? 0) - (categoriesHelperBox?.x ?? 0)),
    ).toBeLessThanOrEqual(8);
    expect(
      Math.abs((urlFieldBox?.x ?? 0) - (urlHelperBox?.x ?? 0)),
    ).toBeLessThanOrEqual(8);
  });
});
