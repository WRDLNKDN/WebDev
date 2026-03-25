import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { fulfillPostgrest, parseEqParam } from '../utils/postgrestFulfill';
import { stubAppSurface } from '../utils/stubAppSurface';
import { selectResearchCategoryInProjectDialog } from './selectResearchCategory';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_FIXTURE = path.resolve(
  __dirname,
  '../../../../public/assets/logo.png',
);

test.describe('Portfolio artifact editing', () => {
  const expectUpdatedArtifactOnDashboard = async (
    page: import('@playwright/test').Page,
  ) => {
    await expect(page.getByLabel('Edit project Updated Artifact')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByText('Updated Artifact')).toBeVisible({
      timeout: 25_000,
    });
    await expect(
      page.getByText('Updated dashboard artifact description.'),
    ).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.locator('img[alt="Updated Artifact"]')).toBeVisible({
      timeout: 25_000,
    });
    await expect(
      page.getByRole('link', { name: 'Open project' }).first(),
    ).toHaveAttribute('href', 'https://example.com/updated-artifact.pdf', {
      timeout: 25_000,
    });
  };

  test('edits an existing artifact from dashboard and reflects changes on profile', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.stack || error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

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

    const portfolioItems = [
      {
        id: 'project-1',
        owner_id: USER_ID,
        title: 'Legacy Artifact',
        description: 'Old dashboard description.',
        image_url: null,
        project_url: 'https://example.com/legacy-artifact.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        sort_order: 0,
        normalized_url: 'https://example.com/legacy-artifact.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: 'failed',
      },
    ];

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

    await page.route(
      '**/rest/v1/rpc/get_own_profile_by_handle*',
      async (route) => {
        await fulfillPostgrest(route, [profile]);
      },
    );

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillPostgrest(route, [profile]);
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await fulfillPostgrest(route, [...portfolioItems]);
        return;
      }

      if (method === 'PATCH') {
        const projectId = parseEqParam(route.request().url(), 'id');
        const payload = route.request().postDataJSON() as Partial<
          (typeof portfolioItems)[number]
        >;
        const index = portfolioItems.findIndex((item) => item.id === projectId);
        if (index < 0) {
          await route.fulfill({ status: 404, body: '{}' });
          return;
        }

        portfolioItems[index] = {
          ...portfolioItems[index],
          ...payload,
        };
        await fulfillPostgrest(route, portfolioItems[index]);
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.route(
      '**/storage/v1/object/project-images/**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: 'project-images-uploaded' }),
        });
      },
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    const systemHalt = page.getByTestId('error-boundary-fallback');
    if (await systemHalt.isVisible().catch(() => false)) {
      throw new Error(
        [pageErrors.join('\n\n'), consoleErrors.join('\n\n')]
          .filter(Boolean)
          .join('\n\n') || 'Dashboard hit the error boundary.',
      );
    }
    await expect(page.getByText('Legacy Artifact')).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('Edit project Legacy Artifact').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/edit project/i);

    await dialog.getByLabel('Project Name').fill('Updated Artifact');
    await dialog
      .getByLabel('Description')
      .fill('Updated dashboard artifact description.');
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('https://example.com/updated-artifact.pdf');

    await selectResearchCategoryInProjectDialog(page, dialog);
    // Move focus out of the category control without closing the dialog.
    await dialog.getByRole('textbox', { name: 'Project URL' }).click();

    await dialog.locator('input[type="file"]').setInputFiles(IMAGE_FIXTURE);

    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    await expectUpdatedArtifactOnDashboard(page);

    // Ensure dashboard reflects persisted values after a full reload,
    // not just optimistic in-memory state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expectUpdatedArtifactOnDashboard(page);

    await page.goto('/profile/member', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Member')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId('portfolio-section-research').getByRole('button', {
        name: /updated artifact/i,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('portfolio-section-research')
        .getByText('Updated dashboard artifact description.'),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('portfolio-section-research')
        .locator('img[alt="Updated Artifact"]'),
    ).toBeVisible();
  });

  test('blocks save when edited artifact URL is invalid', async ({
    page,
    context,
  }) => {
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

    const portfolioItems = [
      {
        id: 'project-1',
        owner_id: USER_ID,
        title: 'Legacy Artifact',
        description: 'Old dashboard description.',
        image_url: null,
        project_url: 'https://example.com/legacy-artifact.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        sort_order: 0,
        normalized_url: 'https://example.com/legacy-artifact.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: 'failed',
      },
    ];

    let patchCalls = 0;

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

    await page.route(
      '**/rest/v1/rpc/get_own_profile_by_handle*',
      async (route) => {
        await fulfillPostgrest(route, [profile]);
      },
    );

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillPostgrest(route, [profile]);
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await fulfillPostgrest(route, [...portfolioItems]);
        return;
      }

      if (method === 'PATCH') {
        patchCalls += 1;
        await route.fulfill({ status: 500, body: '{}' });
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByText('Legacy Artifact')).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('Edit project Legacy Artifact').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/edit project/i);
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('example.com/file.exe');
    await expect(
      dialog.getByRole('button', { name: /save changes/i }),
    ).toBeDisabled();

    await expect(
      dialog.getByText(/Use a full URL starting with https:\/\/ or http:\/\//i),
    ).toBeVisible();
    await expect(dialog.getByText(/fix URL format/i)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Legacy Artifact')).toBeVisible();
    expect(patchCalls).toBe(0);
  });

  test('allows saving an edited artifact URL even when accessibility probing cannot verify it', async ({
    page,
    context,
  }) => {
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

    const portfolioItems = [
      {
        id: 'project-1',
        owner_id: USER_ID,
        title: 'Legacy Artifact',
        description: 'Old dashboard description.',
        image_url: null,
        project_url: 'https://example.com/legacy-artifact.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        sort_order: 0,
        normalized_url: 'https://example.com/legacy-artifact.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: 'failed',
      },
    ];

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

    await page.route(
      '**/rest/v1/rpc/get_own_profile_by_handle*',
      async (route) => {
        await fulfillPostgrest(route, [profile]);
      },
    );

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillPostgrest(route, [profile]);
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await fulfillPostgrest(route, [...portfolioItems]);
        return;
      }

      if (method === 'PATCH') {
        const projectId = parseEqParam(route.request().url(), 'id');
        const payload = route.request().postDataJSON() as Partial<
          (typeof portfolioItems)[number]
        >;
        const index = portfolioItems.findIndex((item) => item.id === projectId);
        if (index < 0) {
          await route.fulfill({ status: 404, body: '{}' });
          return;
        }

        portfolioItems[index] = {
          ...portfolioItems[index],
          ...payload,
        };
        await fulfillPostgrest(route, portfolioItems[index]);
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByText('Legacy Artifact')).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('Edit project Legacy Artifact').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/edit project/i);
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('https://www.google.com');

    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('link', { name: 'Open project' }).first(),
    ).toHaveAttribute('href', 'https://www.google.com');
  });
});
