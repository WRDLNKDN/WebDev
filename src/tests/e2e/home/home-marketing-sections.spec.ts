import { expect, test, type Page } from '../fixtures';

/**
 * Regression: marketing sections must render on `/` for guests (UAT + PROD),
 * not only when production coming-soon is off.
 */
async function expectMarketingSectionHeadingsVisible(page: Page) {
  const whatDifferent = page.getByRole('heading', {
    name: 'What Makes This Different',
    exact: true,
  });
  const howItWorks = page.getByRole('heading', {
    name: 'How It Works',
    exact: true,
  });
  await whatDifferent.scrollIntoViewIfNeeded();
  await expect(whatDifferent).toBeVisible({ timeout: 15_000 });

  await howItWorks.scrollIntoViewIfNeeded();
  await expect(howItWorks).toBeVisible({ timeout: 10_000 });
}

test.describe('Home marketing sections', () => {
  test('shows What Makes This Different and How It Works below the hero', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 30_000,
    });

    await expectMarketingSectionHeadingsVisible(page);
  });

  test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 430, height: 932 } });

    test('shows the same marketing section headings when scrolled into view', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('signed-out-landing')).toBeVisible({
        timeout: 30_000,
      });

      await expectMarketingSectionHeadingsVisible(page);
    });
  });
});
