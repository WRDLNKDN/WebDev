import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Directory empty state', () => {
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
    await expect(
      page.getByRole('link', { name: /join the community/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /join the community/i }),
    ).toHaveCount(0);

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
    let releaseDirectoryResponse: () => void = () => {};
    const directoryResponseReleased = new Promise<void>((resolve) => {
      releaseDirectoryResponse = resolve;
    });
    let sawDirectoryRequest = false;
    await stubAdmin(page);
    await stubAppSurface(page);
    await page.route('**/api/directory*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      sawDirectoryRequest = true;
      await directoryResponseReleased;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], hasMore: false }),
      });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('directory_cache_v1')) {
          sessionStorage.removeItem(key);
        }
      }
    });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect
      .poll(() => sawDirectoryRequest, { timeout: 8_000 })
      .toBeTruthy();

    await expect(
      page.getByRole('progressbar', { name: /loading application/i }),
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('directory-empty-state')).toHaveCount(0);
    releaseDirectoryResponse();
  });
});
