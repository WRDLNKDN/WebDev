import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { fulfillPostgrest } from '../utils/postgrestFulfill';
import { stubAppSurface } from '../utils/stubAppSurface';

async function stubPortfolioDashboardSurface(
  page: import('@playwright/test').Page,
) {
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

  await page.route(
    '**/rest/v1/rpc/get_own_profile_by_handle*',
    async (route) => {
      await fulfillPostgrest(route, [profile]);
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

    await page.getByRole('button', { name: /add resume or project/i }).click();
    await page.getByRole('menuitem', { name: /\+ add project/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/new project/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
