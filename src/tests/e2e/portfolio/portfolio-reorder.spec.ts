import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import {
  readDashboardOrder,
  readProfileOrder,
} from '../utils/portfolioPlaywrightHelpers';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  PORTFOLIO_E2E_MEMBER_PROFILE,
  stubPortfolioDashboardRestRoutes,
} from './portfolioEditStubs';
import {
  E2E_PORTFOLIO_REORDER_INITIAL_ORDER,
  E2E_PORTFOLIO_REORDER_REORDERED_ORDER,
  e2ePortfolioReorderItems,
  gotoDashboardAndExpectPortfolioOrder,
  moveProjectUp,
} from './portfolioEditTestHelpers';

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

    const portfolioItems = e2ePortfolioReorderItems();

    await stubPortfolioDashboardRestRoutes(
      page,
      portfolioItems,
      undefined,
      PORTFOLIO_E2E_MEMBER_PROFILE,
    );

    await gotoDashboardAndExpectPortfolioOrder(
      page,
      E2E_PORTFOLIO_REORDER_INITIAL_ORDER,
    );

    await moveProjectUp(page, 'Gamma Artifact', 2);

    await expect
      .poll(() => readDashboardOrder(page))
      .toEqual([...E2E_PORTFOLIO_REORDER_REORDERED_ORDER]);

    await gotoDashboardAndExpectPortfolioOrder(
      page,
      E2E_PORTFOLIO_REORDER_REORDERED_ORDER,
      50_000,
    );

    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        const sorted = [...portfolioItems].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profile: PORTFOLIO_E2E_MEMBER_PROFILE,
            portfolio: sorted,
          }),
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
      ...E2E_PORTFOLIO_REORDER_REORDERED_ORDER,
    ]);
  });
});
