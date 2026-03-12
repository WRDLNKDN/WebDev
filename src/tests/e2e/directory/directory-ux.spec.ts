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
    connection_state: 'not_connected' as const,
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
    const pathname = new URL(route.request().url()).pathname;
    if (pathname !== '/api/directory') {
      await route.fallback();
      return;
    }

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
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubDirectoryRows(page, 8);

    await page.setViewportSize({ width: 390, height: 844 });
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
    await expect(page.getByText('Member 1')).toBeVisible({ timeout: 10_000 });

    const mobileToggle = page.getByTestId('directory-mobile-controls-toggle');
    await expect(mobileToggle).toBeVisible();
    await expect(page.getByTestId('directory-filters')).not.toBeVisible();

    await mobileToggle.click();
    await expect(page.getByTestId('directory-filters')).toBeVisible();
    await expect(mobileToggle).toHaveText(/hide filters/i);

    await page.getByLabel('Sort results').click();
    await page.getByRole('option', { name: 'Alphabetical' }).click();
    await expect(page).toHaveURL(/sort=alphabetical/);

    const toolbarToggle = page.getByTestId('directory-mobile-toolbar-toggle');
    await expect(toolbarToggle).toHaveText(/hide filters/i);
    await toolbarToggle.click();
    await expect(page.getByTestId('directory-filters')).not.toBeVisible();
    await expect(page.getByTestId('directory-results-toolbar')).toBeVisible();
    await expect(toolbarToggle).toHaveText(/filters & sort/i);
  });

  test('results toolbar anchors sort controls directly above results', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubDirectoryRows(page, 40);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/directory', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 20_000,
    });
    const firstMember = page.getByRole('link', {
      name: 'Member 1',
      exact: true,
    });
    await expect(firstMember).toBeVisible({ timeout: 10_000 });

    const toolbar = page.getByTestId('directory-results-toolbar');
    await expect(toolbar).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    const firstMemberBox = await firstMember.boundingBox();
    expect(toolbarBox).not.toBeNull();
    expect(firstMemberBox).not.toBeNull();
    expect(
      (toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0),
    ).toBeLessThanOrEqual(firstMemberBox?.y ?? 0);

    await page.getByLabel('Sort results').click();
    await page.getByRole('option', { name: 'Alphabetical' }).click();
    await expect(page).toHaveURL(/sort=alphabetical/);
    await expect(toolbar).toBeVisible();
    await expect(firstMember).toBeVisible();
  });

  test('active filter chips expose non-search filters and can clear them individually', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubDirectoryRows(page, 8);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto(
      '/directory?primary_industry=Technology%20and%20Software&secondary_industry=Cloud%20Computing&location=New%20York%2C%20NY&connection_status=not_connected',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId('directory-page')).toBeVisible({
      timeout: 20_000,
    });

    await expect(
      page.getByText('Industry: Technology and Software'),
    ).toBeVisible();
    await expect(page.getByText('Sub-industry: Cloud Computing')).toBeVisible();
    await expect(page.getByText('Location: New York, NY')).toBeVisible();
    await expect(page.getByText('Connection: Not connected')).toBeVisible();

    await page
      .getByTestId('directory-active-filter-connection')
      .locator('.MuiChip-deleteIcon')
      .click();

    await expect(page).toHaveURL(
      (url) => !url.searchParams.has('connection_status'),
      { timeout: 5_000 },
    );
    await expect(page.getByText('Connection: Not connected')).toHaveCount(0);
  });
});
