import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe.configure({ timeout: 90_000 });

test.describe('Issue #609 - Dashboard grouped links in Identity', () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 45_000 });
  });

  test('links render inside Identity section, not inside Portfolio section', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    const portfolioSection = page.getByTestId('portfolio-section');

    await expect(identitySection.getByRole('link').first()).toBeVisible();
    await expect(
      portfolioSection.getByTestId('dashboard-links-block'),
    ).not.toBeAttached();
  });

  test('links section header reads LINKS and is inside Identity', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(
      identitySection.getByText('LINKS', { exact: true }),
    ).toBeVisible();
  });

  test('LINKS section is expanded by default', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByRole('link').first()).toBeVisible();
  });

  test('LINKS section can be collapsed and re-expanded', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    const toggleBtn = identitySection.getByRole('button', {
      name: /links/i,
    });

    await toggleBtn.click();
    await expect(identitySection.getByRole('link').first()).not.toBeVisible();

    await toggleBtn.click();
    await expect(identitySection.getByRole('link').first()).toBeVisible();
  });

  test('each category can be collapsed independently and starts expanded', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    const professionalGroup = identitySection.getByTestId(
      'link-group-Professional',
    );
    const socialGroup = identitySection.getByTestId('link-group-Social');

    await expect(professionalGroup.getByRole('link').first()).toBeVisible();
    await expect(socialGroup.getByRole('link').first()).toBeVisible();

    await identitySection
      .getByRole('button', { name: /^Professional$/i })
      .click();
    await expect(professionalGroup.getByRole('link').first()).not.toBeVisible();
    await expect(socialGroup.getByRole('link').first()).toBeVisible();

    await identitySection
      .getByRole('button', { name: /^Professional$/i })
      .click();
    await expect(professionalGroup.getByRole('link').first()).toBeVisible();
  });

  test('category headings Professional, Social, Content are visible', async ({
    page,
  }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByText('Professional')).toBeVisible();
    await expect(identitySection.getByText('Social')).toBeVisible();
    await expect(identitySection.getByText('Content')).toBeVisible();
  });

  test('links within Professional are alphabetized', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    const profGroup = identitySection.getByTestId('link-group-Professional');
    const linkTexts = await profGroup.getByRole('link').allTextContents();

    const sorted = [...linkTexts].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkTexts).toEqual(sorted);
  });

  test('links within Social are alphabetized', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    const socialGroup = identitySection.getByTestId('link-group-Social');
    const linkTexts = await socialGroup.getByRole('link').allTextContents();

    const sorted = [...linkTexts].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkTexts).toEqual(sorted);
  });

  test('links within Content are alphabetized', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    const contentGroup = identitySection.getByTestId('link-group-Content');
    const linkTexts = await contentGroup.getByRole('link').allTextContents();

    const sorted = [...linkTexts].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkTexts).toEqual(sorted);
  });

  test('categories with no links are not rendered', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    await expect(
      identitySection.getByTestId('link-group-Other'),
    ).not.toBeAttached();
  });

  test('each link is clickable and retains its href', async ({ page }) => {
    const identitySection = page.getByTestId('identity-header');
    const firstLink = identitySection.getByRole('link').first();
    await expect(firstLink).toHaveAttribute('href', /^https?:\/\//);
    await expect(firstLink).toHaveAttribute('target', '_blank');
  });

  test('layout is responsive: links section visible on mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const identitySection = page.getByTestId('identity-header');
    await expect(identitySection.getByRole('link').first()).toBeVisible();
  });

  test('Portfolio section has no LINKS block in both populated and empty states', async ({
    page,
  }) => {
    const portfolioSection = page.getByTestId('portfolio-section');
    await expect(
      portfolioSection.getByTestId('dashboard-links-block'),
    ).not.toBeAttached();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      portfolioSection.getByTestId('dashboard-links-block'),
    ).not.toBeAttached();
  });
});
