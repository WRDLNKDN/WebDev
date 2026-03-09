import { expect, test, type Page, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

function parseEqParam(url: string, key: string) {
  const raw = new URL(url).searchParams.get(key);
  return raw?.replace(/^eq\./, '') ?? null;
}

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

async function readDashboardOrder(page: Page): Promise<string[]> {
  return page
    .locator('main button[aria-label^="Edit project "]')
    .evaluateAll((els) =>
      els.map((el) =>
        (el.getAttribute('aria-label') || '').replace(/^Edit project\s+/, ''),
      ),
    );
}

async function readProfileOrder(page: Page): Promise<string[]> {
  return page.locator('main img[alt$="Artifact"]').evaluateAll((els) =>
    els
      .map((el) => (el as HTMLImageElement).alt.trim())
      .filter(Boolean)
      .slice(0, 10),
  );
}

test.describe('Portfolio artifact reorder', () => {
  test('persists configured artifact order on dashboard and profile', async ({
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
        title: 'Alpha Artifact',
        description: 'Alpha description',
        image_url: 'https://example.com/alpha.png',
        project_url: 'https://example.com/alpha.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-02T00:00:00.000Z').toISOString(),
        sort_order: 0,
        normalized_url: 'https://example.com/alpha.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: null,
      },
      {
        id: 'project-2',
        owner_id: USER_ID,
        title: 'Beta Artifact',
        description: 'Beta description',
        image_url: 'https://example.com/beta.png',
        project_url: 'https://example.com/beta.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-03T00:00:00.000Z').toISOString(),
        sort_order: 1,
        normalized_url: 'https://example.com/beta.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: null,
      },
      {
        id: 'project-3',
        owner_id: USER_ID,
        title: 'Gamma Artifact',
        description: 'Gamma description',
        image_url: 'https://example.com/gamma.png',
        project_url: 'https://example.com/gamma.pdf',
        tech_stack: ['Case Study'],
        is_highlighted: false,
        created_at: new Date('2026-01-04T00:00:00.000Z').toISOString(),
        sort_order: 2,
        normalized_url: 'https://example.com/gamma.pdf',
        embed_url: null,
        resolved_type: 'pdf',
        thumbnail_url: null,
        thumbnail_status: null,
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
        const sorted = [...portfolioItems].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        await fulfillPostgrest(route, sorted);
        return;
      }
      if (method === 'PATCH') {
        const projectId = parseEqParam(route.request().url(), 'id');
        const payload = route.request().postDataJSON() as {
          sort_order?: number;
        };
        const idx = portfolioItems.findIndex((item) => item.id === projectId);
        if (idx >= 0 && typeof payload.sort_order === 'number') {
          portfolioItems[idx] = {
            ...portfolioItems[idx],
            sort_order: payload.sort_order,
          };
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 40_000,
    });
    await expect
      .poll(() => readDashboardOrder(page), { timeout: 30_000 })
      .toEqual(['Alpha Artifact', 'Beta Artifact', 'Gamma Artifact']);

    await page.getByLabel('Move project Gamma Artifact up').click();
    await page.getByLabel('Move project Gamma Artifact up').click();

    await expect
      .poll(() => readDashboardOrder(page))
      .toEqual(['Gamma Artifact', 'Alpha Artifact', 'Beta Artifact']);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 40_000,
    });
    await expect
      .poll(() => readDashboardOrder(page), { timeout: 30_000 })
      .toEqual(['Gamma Artifact', 'Alpha Artifact', 'Beta Artifact']);

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

    await page.goto('/p/member-reorder-token', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('portfolio-section-case-study')).toBeVisible({
      timeout: 30_000,
    });
    expect(await readProfileOrder(page)).toEqual([
      'Gamma Artifact',
      'Alpha Artifact',
      'Beta Artifact',
    ]);
  });
});
