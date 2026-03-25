import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { fulfillPostgrest } from '../utils/postgrestFulfill';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Portfolio artifact edit validation', () => {
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
      timeout: 35_000,
    });
    await expect(page.getByText('Legacy Artifact')).toBeVisible({
      timeout: 30_000,
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
});
