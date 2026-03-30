import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  PORTFOLIO_E2E_MEMBER_PROFILE,
  stubPortfolioDashboardRestRoutes,
} from './portfolioEditStubs';

async function stubPortfolioDashboardSurface(
  page: import('@playwright/test').Page,
) {
  await stubPortfolioDashboardRestRoutes(
    page,
    [],
    { kind: 'merge' },
    PORTFOLIO_E2E_MEMBER_PROFILE,
    'alwaysPostgrest',
  );
}

test.describe('Portfolio accessibility', () => {
  test('dashboard portfolio section has no WCAG 2a/2aa/21aa violations', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubPortfolioDashboardSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const portfolioSection = page.getByTestId(
      'dashboard-portfolio-showcase-section',
    );
    await expect(portfolioSection).toBeVisible({ timeout: 45_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('[data-testid="dashboard-portfolio-showcase-section"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('add project dialog has no WCAG 2a/2aa/21aa violations', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubPortfolioDashboardSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: /add to portfolio/i }).click();
    await page.getByRole('menuitem', { name: /^add project$/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/new project/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
