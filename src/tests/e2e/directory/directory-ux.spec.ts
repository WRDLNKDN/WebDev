import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

function makeMember(index: number) {
  return {
    id: `member-${index}`,
    handle: `member${index}`,
    display_name: `Member ${index}`,
    avatar: null,
    tagline: `Tagline ${index}`,
    pronouns: null,
    industry: 'Technology and Software',
    secondary_industry: 'Cloud Computing',
    location: index % 2 === 0 ? 'New York, NY' : 'Remote',
    skills: ['Testing'],
    bio_snippet: `Bio snippet ${index}`,
    connection_state: 'connected' as const,
    use_weirdling_avatar: false,
  };
}

async function stubDirectoryRows(
  page: import('@playwright/test').Page,
  count: number,
) {
  const rows = Array.from({ length: count }, (_, index) =>
    makeMember(index + 1),
  );

  await page.route('**/api/directory*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: rows,
        hasMore: false,
      }),
    });
  });
}

test.describe('Directory UX polish', () => {
  test('mobile filters collapse and reopen while keeping results context', async ({
    page,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubDirectoryRows(page, 8);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });

    const mobileToggle = page.getByTestId('directory-mobile-controls-toggle');
    await expect(mobileToggle).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('directory-filters')).not.toBeVisible();

    await mobileToggle.click();
    await expect(page.getByTestId('directory-filters')).toBeVisible();

    await page.getByLabel('Sort results').click();
    await page.getByRole('option', { name: 'Alphabetical' }).click();
    await expect(page).toHaveURL(/sort=alphabetical/);

    await page.getByTestId('directory-mobile-toolbar-toggle').click();
    await expect(page.getByTestId('directory-filters')).not.toBeVisible();
    await expect(page.getByTestId('directory-results-toolbar')).toBeVisible();
  });

  test('results toolbar stays visible while scrolling long result lists', async ({
    page,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubDirectoryRows(page, 40);

    await page.goto('/directory', { waitUntil: 'domcontentloaded' });

    const toolbar = page.getByTestId('directory-results-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 25_000 });

    const topBefore = await toolbar.evaluate((node) =>
      Math.round(node.getBoundingClientRect().top),
    );

    await page.evaluate(() => {
      const scrollContainer = document.querySelector(
        '[data-testid="app-scroll-container"]',
      ) as HTMLElement | null;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: 1200,
          behavior: 'instant' as ScrollBehavior,
        });
      }
    });

    const topAfter = await toolbar.evaluate((node) =>
      Math.round(node.getBoundingClientRect().top),
    );

    expect(topAfter).toBeLessThan(topBefore);
    expect(topAfter).toBeLessThanOrEqual(80);
    await expect(toolbar).toBeVisible();
  });
});
