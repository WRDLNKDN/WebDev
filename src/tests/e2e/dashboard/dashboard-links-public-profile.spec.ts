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

  test('links render in Links section on Profile (below Identity)', async ({
    page,
  }) => {
    const linksSection = page.getByTestId('profile-links-section');
    await expect(linksSection.getByRole('link').first()).toBeVisible();
  });

  test('links do not render inside Portfolio section on Profile', async ({
    page,
  }) => {
    const portfolioSection = page.getByTestId('portfolio-section');
    await expect(
      portfolioSection.getByTestId('profile-links-widget'),
    ).not.toBeAttached();
  });

  test('LINKS section header is present on Profile', async ({ page }) => {
    const linksSection = page.getByTestId('profile-links-section');
    await expect(
      linksSection.getByText('LINKS', { exact: true }),
    ).toBeVisible();
  });

  test('links are grouped by category on Profile', async ({ page }) => {
    const linksSection = page.getByTestId('profile-links-section');
    await expect(linksSection.getByText('Professional')).toBeVisible();
    await expect(linksSection.getByText('Social')).toBeVisible();
  });

  test('links within each category are alphabetized on Profile', async ({
    page,
  }) => {
    const linksSection = page.getByTestId('profile-links-section');
    const profGroup = linksSection.getByTestId('link-group-Professional');
    const linkTexts = await profGroup.getByRole('link').allTextContents();

    const sorted = [...linkTexts].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(linkTexts).toEqual(sorted);
  });

  test('links keep platform indicators/icons and remain clickable', async ({
    page,
  }) => {
    const linksSection = page.getByTestId('profile-links-section');
    const profGroup = linksSection.getByTestId('link-group-Professional');
    const firstLink = profGroup.getByRole('link').first();

    await expect(firstLink).toHaveAttribute('href', /^https?:\/\//);
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink.locator('svg').first()).toBeVisible();
  });

  test('link groups are expanded by default and can be collapsed', async ({
    page,
  }) => {
    const linksSection = page.getByTestId('profile-links-section');
    await expect(linksSection.getByRole('link').first()).toBeVisible();
    const professionalGroup = linksSection.getByTestId(
      'link-group-Professional',
    );
    await expect(
      professionalGroup.getByRole('link', { name: /GitHub/i }),
    ).toBeVisible();

    const toggleBtn = professionalGroup.getByRole('button', {
      name: /professional/i,
    });
    await toggleBtn.click();
    await expect(
      professionalGroup.getByRole('link', { name: /GitHub/i }),
    ).not.toBeVisible();
  });
});
