import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { readDashboardOrder } from '../utils/portfolioPlaywrightHelpers';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  PORTFOLIO_E2E_MEMBER_PROFILE,
  stubPortfolioDashboardRestRoutes,
} from './portfolioEditStubs';
import {
  E2E_PORTFOLIO_REORDER_INITIAL_ORDER,
  e2ePortfolioReorderItems,
  gotoDashboardAndExpectPortfolioOrder,
  moveProjectUp,
} from './portfolioEditTestHelpers';

test.describe('Portfolio artifact reorder rollback', () => {
  test('rolls back optimistic reorder when persistence fails', async ({
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
      {
        kind: 'failPatch',
        counter: { n: 0 },
        shouldFail: (projectId) => projectId === 'project-3',
      },
      PORTFOLIO_E2E_MEMBER_PROFILE,
    );

    await gotoDashboardAndExpectPortfolioOrder(
      page,
      E2E_PORTFOLIO_REORDER_INITIAL_ORDER,
    );

    await moveProjectUp(page, 'Gamma Artifact', 2);

    await expect(
      page.getByText('Could not save artifact order. Please try again.'),
    ).toBeVisible();
    await expect
      .poll(() => readDashboardOrder(page))
      .toEqual(['Alpha Artifact', 'Beta Artifact', 'Gamma Artifact']);
  });
});
