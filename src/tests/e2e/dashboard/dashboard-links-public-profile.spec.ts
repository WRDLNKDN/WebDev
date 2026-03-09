import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Issue #609 - Public Profile grouped links', () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
    await page.goto('/p/h~test-user-with-links', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Member', exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('links render inside Identity section on Profile', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByRole('link').first()).toBeVisible();
  });

  test('links do not render inside Portfolio section on Profile', async ({
    page,
  }) => {
    const portfolioSection = page.getByTestId('portfolio-section');
    await expect(
      portfolioSection.getByTestId('profile-links-widget'),
    ).not.toBeAttached();
  });

  test('LINKS collapsible header is present in Identity', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(
      identitySection.getByText('LINKS', { exact: true }),
    ).toBeVisible();
  });

  test('links are grouped by category on Profile', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByText('Professional')).toBeVisible();
    await expect(identitySection.getByText('Social')).toBeVisible();
  });

  test('links within each category are alphabetized on Profile', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    const profGroup = identitySection.getByTestId('link-group-Professional');
    const linkTexts = await profGroup.getByRole('link').allTextContents();

    const sorted = [...linkTexts].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkTexts).toEqual(sorted);
  });

  test('links keep platform indicators/icons and remain clickable', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    const profGroup = identitySection.getByTestId('link-group-Professional');
    const firstLink = profGroup.getByRole('link').first();

    await expect(firstLink).toHaveAttribute('href', /^https?:\/\//);
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink.locator('svg').first()).toBeVisible();
  });

  test('LINKS section is expanded by default and can be collapsed', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByRole('link').first()).toBeVisible();

    const toggleBtn = identitySection.getByRole('button', { name: /links/i });
    await toggleBtn.click();
    await expect(identitySection.getByRole('link').first()).not.toBeVisible();
  });
});
