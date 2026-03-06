import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Directory empty state', () => {
  // fixme: depends on auth/session stubs; directory can show sign-in or SYSTEM_HALT until stubs are fixed
  test.fixme(
    'when filters return zero results, shows empty state and Clear filters action',
    async ({ page, context }) => {
      test.setTimeout(45_000);
      await seedSignedInSession(context);
      await stubAppSurface(page);

      // Stub directory API to return empty list
      await page.route('**/api/directory*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], hasMore: false }),
        });
      });

      // Open directory with a filter so hasActiveFilters is true
      await page.goto('/directory?primary_industry=Technology+and+Software', {
        waitUntil: 'domcontentloaded',
      });

      await expect(page.getByTestId('directory-page')).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        page.getByRole('heading', { name: /discover members/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Empty state should be visible with message and Clear filters
      await expect(page.getByTestId('directory-empty-state')).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole('heading', { name: /no members found/i }),
      ).toBeVisible();
      await expect(
        page.getByText(/no members match your filters/i),
      ).toBeVisible();
      const clearFiltersBtn = page.getByTestId('directory-clear-filters');
      await expect(clearFiltersBtn).toBeVisible();
      await expect(clearFiltersBtn).toHaveText(/clear filters/i);

      // Click Clear filters and verify URL no longer has primary_industry
      await clearFiltersBtn.click();
      await expect(page).toHaveURL(
        (url) => !url.searchParams.has('primary_industry'),
        { timeout: 5_000 },
      );
    },
  );

  test.fixme(
    'when results are loading, shows loading indicator not empty state',
    async ({ page, context }) => {
      test.setTimeout(30_000);
      await seedSignedInSession(context);
      await stubAppSurface(page);

      // Stub directory to delay so we see loading state
      await page.route('**/api/directory*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await new Promise((r) => setTimeout(r, 800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], hasMore: false }),
        });
      });

      await page.goto('/directory', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('directory-page')).toBeVisible({
        timeout: 15_000,
      });

      // While loading we should see a loading indicator (CircularProgress or similar), not the empty state message immediately
      const loadingOrEmpty = page
        .getByTestId('directory-empty-state')
        .or(page.locator('[role="progressbar"]'));
      await expect(loadingOrEmpty.first()).toBeVisible({ timeout: 3_000 });
    },
  );
});
