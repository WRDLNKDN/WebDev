import type { Page } from '@playwright/test';
import { USER_ID } from '../utils/auth';
import { fulfillPostgrest, parseEqParam } from '../utils/postgrestFulfill';

/** Dashboard member row reused across portfolio edit / accessibility E2E stubs. */
export const PORTFOLIO_E2E_MEMBER_PROFILE: Record<string, unknown> = {
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

export type PortfolioE2eItem = Record<string, unknown>;

export type PortfolioDashboardPatchMode =
  | { kind: 'merge' }
  | {
      kind: 'mergeAndCapture';
      captured: { current: Record<string, unknown> | null };
    }
  | { kind: 'failPatch'; counter: { n: number } };

/**
 * Stubs share token, profile-by-handle, profiles, and portfolio_items routes
 * the way portfolio dashboard edit tests expect.
 */
export async function stubPortfolioDashboardRestRoutes(
  page: Page,
  mutableItems: PortfolioE2eItem[],
  patchMode: PortfolioDashboardPatchMode = { kind: 'merge' },
  profile: Record<string, unknown> = PORTFOLIO_E2E_MEMBER_PROFILE,
  profilesMode: 'restful' | 'alwaysPostgrest' = 'restful',
): Promise<void> {
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
    if (profilesMode === 'alwaysPostgrest') {
      await fulfillPostgrest(route, [profile]);
      return;
    }
    if (route.request().method() === 'GET') {
      await fulfillPostgrest(route, [profile]);
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/rest/v1/portfolio_items*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await fulfillPostgrest(route, [...mutableItems]);
      return;
    }

    if (method === 'PATCH') {
      if (patchMode.kind === 'failPatch') {
        patchMode.counter.n += 1;
        await route.fulfill({ status: 500, body: '{}' });
        return;
      }

      const projectId = parseEqParam(route.request().url(), 'id');
      const payload = route.request().postDataJSON() as Record<string, unknown>;

      if (patchMode.kind === 'mergeAndCapture') {
        patchMode.captured.current = payload;
      }

      const index = mutableItems.findIndex((item) => item['id'] === projectId);
      if (index < 0) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }

      mutableItems[index] = { ...mutableItems[index], ...payload };
      await fulfillPostgrest(route, mutableItems[index]);
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });
}
