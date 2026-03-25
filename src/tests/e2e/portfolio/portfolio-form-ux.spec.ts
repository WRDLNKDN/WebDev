import { expect, test, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import { selectResearchCategoryInProjectDialog } from './selectResearchCategory';

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
  let portfolioItems: Array<Record<string, unknown>>;
  let postedPortfolioPayloads: Array<Record<string, unknown>>;

  test.beforeEach(async ({ page, context }) => {
    portfolioItems = [];
    postedPortfolioPayloads = [];

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
      const method = route.request().method();

      if (method === 'GET') {
        await fulfillPostgrest(route, [...portfolioItems]);
        return;
      }

      if (method === 'POST') {
        const payload = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        postedPortfolioPayloads.push(payload);

        const insertedRow = {
          id: `project-${portfolioItems.length + 1}`,
          owner_id: USER_ID,
          created_at: new Date('2026-03-11T12:00:00.000Z').toISOString(),
          sort_order: portfolioItems.length,
          thumbnail_url: null,
          thumbnail_status: payload.image_url ? null : 'pending',
          ...payload,
        };

        portfolioItems.push(insertedRow);
        await fulfillPostgrest(route, insertedRow);
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

  test('uses URL-only source (no upload file or URL toggle)', async ({
    page,
  }) => {
    const dialog = await openAddProjectDialog(page);

    await expect(
      dialog.getByRole('textbox', { name: 'Project URL' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /upload file/i }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: /enter project url/i }),
    ).toHaveCount(0);
  });

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

    const categoriesField = dialog.getByPlaceholder('Select a category');
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

  test('shows a custom category field when Other is selected', async ({
    page,
  }) => {
    const dialog = await openAddProjectDialog(page);

    const categoryField = dialog.getByRole('combobox', { name: 'Category' });
    await categoryField.click();
    await page.getByRole('option', { name: 'Other' }).click();

    const customCategoryField = dialog.getByRole('textbox', {
      name: 'Custom Category',
    });
    await expect(customCategoryField).toBeVisible();
    await customCategoryField.fill('Community Tooling');
    await expect(
      dialog.getByText('17/40 characters. Saved exactly as entered.', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('saves a project with Other using the exact custom category value', async ({
    page,
  }) => {
    const dialog = await openAddProjectDialog(page);

    await dialog.getByLabel('Project Name').fill('Custom Category Project');
    await dialog.getByRole('combobox', { name: 'Category' }).click();
    await page.getByRole('option', { name: 'Other' }).click();
    await dialog
      .getByRole('textbox', { name: 'Custom Category' })
      .fill('Community Tooling');
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('https://example.com/custom-category-project');

    await dialog.getByRole('button', { name: /add to portfolio/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    expect(postedPortfolioPayloads).toHaveLength(1);
    expect(postedPortfolioPayloads[0]).toMatchObject({
      title: 'Custom Category Project',
      tech_stack: ['Community Tooling'],
    });

    await expect(page.getByText('Custom Category Project')).toBeVisible();
    await page.getByLabel('Edit project Custom Category Project').click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toContainText(/edit project/i);
    await expect(
      editDialog.getByRole('combobox', { name: 'Category' }),
    ).toHaveValue('Other');
    await expect(
      editDialog.getByRole('textbox', { name: 'Custom Category' }),
    ).toHaveValue('Community Tooling');
  });

  test('saves a project without a description', async ({ page }) => {
    const dialog = await openAddProjectDialog(page);

    await dialog.getByLabel('Project Name').fill('No Description Project');
    await selectResearchCategoryInProjectDialog(page, dialog);
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('https://example.com/no-description-project');

    await expect(dialog.getByText(/add a description/i)).not.toBeVisible();

    await dialog.getByRole('button', { name: /add to portfolio/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    expect(postedPortfolioPayloads).toHaveLength(1);
    expect(postedPortfolioPayloads[0]).toMatchObject({
      title: 'No Description Project',
      description: null,
      tech_stack: ['Research'],
    });

    await expect(page.getByText('No Description Project')).toBeVisible();
  });
});
