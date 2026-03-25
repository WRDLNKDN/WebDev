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

function parseEqParam(url: string, key: string) {
  const raw = new URL(url).searchParams.get(key);
  return raw?.replace(/^eq\./, '') ?? null;
}

test.describe('Dashboard portfolio showcase management', () => {
  test('creates, highlights, and deletes portfolio artifacts with public profile updates', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);

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

    const portfolioItems: Array<{
      id: string;
      owner_id: string;
      title: string;
      description: string;
      image_url: string | null;
      project_url: string;
      tech_stack: string[];
      is_highlighted: boolean;
      created_at: string;
      sort_order: number;
      normalized_url: string;
      embed_url: string | null;
      resolved_type: string | null;
      thumbnail_url: string | null;
      thumbnail_status: string | null;
    }> = [];

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

    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        const sorted = [...portfolioItems].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ profile, portfolio: sorted }),
        });
      },
    );

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        const sorted = [...portfolioItems].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        await fulfillPostgrest(route, sorted);
        return;
      }

      if (method === 'POST') {
        const payload = route.request().postDataJSON() as {
          title: string;
          description: string;
          image_url?: string | null;
          project_url: string;
          tech_stack: string[];
          is_highlighted?: boolean;
          sort_order?: number;
          normalized_url?: string;
          embed_url?: string | null;
          resolved_type?: string | null;
          thumbnail_url?: string | null;
          thumbnail_status?: string | null;
        };
        const created = {
          id: 'project-created-1',
          owner_id: USER_ID,
          title: payload.title,
          description: payload.description,
          image_url: payload.image_url ?? null,
          project_url: payload.project_url,
          tech_stack: payload.tech_stack,
          is_highlighted: Boolean(payload.is_highlighted),
          created_at: new Date('2026-03-11T12:00:00.000Z').toISOString(),
          sort_order: payload.sort_order ?? portfolioItems.length,
          normalized_url: payload.normalized_url ?? payload.project_url,
          embed_url: payload.embed_url ?? null,
          resolved_type: payload.resolved_type ?? 'website',
          thumbnail_url: payload.thumbnail_url ?? null,
          thumbnail_status: payload.thumbnail_status ?? 'pending',
        };
        portfolioItems.push(created);
        await fulfillPostgrest(route, created);
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

      if (method === 'DELETE') {
        const projectId = parseEqParam(route.request().url(), 'id');
        const index = portfolioItems.findIndex((item) => item.id === projectId);
        if (index >= 0) portfolioItems.splice(index, 1);
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole('button', { name: /add resume or project/i }).click();
    await page.getByRole('menuitem', { name: /\+ add project/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/new project/i);

    await dialog.getByLabel('Project Name').fill('Portfolio Launch');
    await dialog
      .getByLabel('Description')
      .fill('Launch artifact managed from dashboard.');
    await dialog
      .getByRole('textbox', { name: 'Project URL' })
      .fill('https://example.com/portfolio-launch');

    await selectResearchCategoryInProjectDialog(page, dialog);
    await dialog.getByRole('textbox', { name: 'Project URL' }).click();

    await dialog.getByRole('button', { name: /add to portfolio/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Portfolio Launch')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText('Launch artifact managed from dashboard.'),
    ).toBeVisible();

    await page
      .getByLabel('Mark artifact Portfolio Launch as highlight')
      .click();

    await expect(page.getByTestId('portfolio-highlights-carousel')).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(
      page.getByTestId('portfolio-highlights-carousel'),
    ).toContainText('Portfolio Launch');

    await page.goto('/profile/member', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Member')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('portfolio-highlights-carousel')).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(
      page.getByTestId('portfolio-highlights-carousel'),
    ).toContainText('Portfolio Launch');
    await expect(
      page.getByTestId('portfolio-section-research').getByRole('button', {
        name: /portfolio launch/i,
      }),
    ).toBeVisible();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });
    await page.getByLabel('Remove project Portfolio Launch').click();
    await expect(page.getByText('Portfolio Launch')).toHaveCount(0);

    await page.goto('/profile/member', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Member')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Portfolio Launch')).toHaveCount(0);
    await expect(page.getByTestId('portfolio-highlights-carousel')).toHaveCount(
      0,
    );
    await expect(page.getByTestId('portfolio-section-research')).toHaveCount(0);
  });
});
