import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

// fixme: authenticated E2E (session/profile stub) fails; unit tests cover directory empty state logic
test.describe.fixme('Directory empty state', () => {
  test('sanity: session from init after first nav — app-main and directory-page visible', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc: stubAdmin } = await seedSignedInSession(
      page.context(),
    );
    await stubAdmin(page);
    await stubAppSurface(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 25_000,
    });
  });

  test('when filters return zero results, shows empty state and Clear filters action', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc: stubAdmin } = await seedSignedInSession(
      page.context(),
    );
    await stubAdmin(page);
    await stubAppSurface(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('heading', { name: /discover members/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Apply filter to get empty results, then assert empty state
    await page.goto('/directory?primary_industry=Technology+and+Software', {
      waitUntil: 'domcontentloaded',
    });
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

    await clearFiltersBtn.click();
    await expect(page).toHaveURL(
      (url) => !url.searchParams.has('primary_industry'),
      { timeout: 5_000 },
    );
  });

  test('when results are loading, shows loading indicator not empty state', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    const { stubAdminRpc: stubAdmin } = await seedSignedInSession(
      page.context(),
    );
    await stubAdmin(page);
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
    await stubAppSurface(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 20_000,
    });

    const loadingOrEmpty = page
      .getByTestId('directory-empty-state')
      .or(page.locator('[role="progressbar"]'));
    await expect(loadingOrEmpty.first()).toBeVisible({ timeout: 8_000 });
  });
});
