import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard links and profile layout regressions', () => {
  test('profile header is left-justified, skills wrap naturally, and industries collapse by group', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 15_000 });

    // ---- HEADER LEFT ALIGN CHECK ----

    const identityHeader = page.getByTestId('identity-header');
    await expect(identityHeader).toBeVisible({ timeout: 15_000 });

    const heading = identityHeader.getByRole('heading').first();
    await expect(heading).toBeVisible();

    const layoutMetrics = await identityHeader.evaluate((container) => {
      const headingEl = container.querySelector('h1, h2, h3, h4, h5, h6');
      if (!headingEl) {
        return null;
      }

      const headingRect = headingEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      return {
        headingX: headingRect.x,
        containerX: containerRect.x,
      };
    });

    expect(layoutMetrics).not.toBeNull();

    // heading should not be centered or pushed right (left-aligned)
    const leftOffset =
      (layoutMetrics?.headingX ?? 0) - (layoutMetrics?.containerX ?? 0);

    expect(leftOffset).toBeLessThan(400);

    // ---- SKILLS CHIP WIDTH CHECK ----

    const pills = page.getByTestId('dashboard-pill');
    const pillCount = await pills.count();

    if (pillCount > 0) {
      const firstPill = pills.first();
      const pillMetrics = await firstPill.evaluate((el) => {
        const parent = el.parentElement;
        const rect = el.getBoundingClientRect();
        const parentRect = parent?.getBoundingClientRect();

        return {
          width: rect.width,
          parentWidth: parentRect?.width ?? 0,
        };
      });

      // pill should not be full width (allow for narrow parent / single pill)
      expect(pillMetrics.width).toBeLessThan(pillMetrics.parentWidth * 0.99);
    }

    // ---- INDUSTRY GROUP CHECK (collapsed by default; expand/collapse on click) ----

    const technologyGroup = page.getByTestId(
      'dashboard-industry-group-Technology',
    );
    await expect(technologyGroup).toBeVisible();

    const technologyToggle = technologyGroup.getByRole('button', {
      name: /technology/i,
    });
    await expect(technologyToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(
      technologyGroup.getByText('Cloud Computing'),
    ).not.toBeVisible();

    await technologyToggle.click();
    await expect(technologyToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(technologyGroup.getByText('Cloud Computing')).toBeVisible();
    await expect(technologyGroup.getByText('Cybersecurity')).toBeVisible();

    await technologyToggle.click();
    await expect(technologyToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(
      technologyGroup.getByText('Cloud Computing'),
    ).not.toBeVisible();
  });

  test('links section sits between Identity and Portfolio Showcase and link management is not in the profile menu', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 15_000,
    });

    const identity = page.getByTestId('identity-header');
    const linksSection = page.getByTestId('dashboard-links-section');
    const portfolioShowcase = page.getByTestId(
      'dashboard-portfolio-showcase-section',
    );

    await expect(identity).toBeVisible({ timeout: 15_000 });
    await expect(linksSection).toBeVisible({ timeout: 15_000 });
    await expect(portfolioShowcase).toBeVisible({ timeout: 15_000 });
    await expect(
      linksSection.getByText('LINKS', { exact: true }),
    ).toBeVisible();
    await expect(
      portfolioShowcase.getByText('PORTFOLIO SHOWCASE', { exact: true }),
    ).toBeVisible();

    const [identityBox, linksBox, portfolioBox] = await Promise.all([
      identity.boundingBox(),
      linksSection.boundingBox(),
      portfolioShowcase.boundingBox(),
    ]);

    expect(identityBox).not.toBeNull();
    expect(linksBox).not.toBeNull();
    expect(portfolioBox).not.toBeNull();

    expect(linksBox?.y ?? 0).toBeGreaterThan(identityBox?.y ?? 0);
    expect(portfolioBox?.y ?? 0).toBeGreaterThan(linksBox?.y ?? 0);

    const profileButton = page.getByRole('button', { name: /profile/i });
    await profileButton.click();
    await expect(
      page.getByRole('menuitem', { name: /add or edit links/i }),
    ).toHaveCount(0);
  });

  test('links render grouped in wrapped category blocks and each category can collapse', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('dashboard-links-section')).toBeVisible({
      timeout: 15_000,
    });

    const professionalGroup = page.getByTestId(
      'dashboard-links-group-Professional',
    );
    const socialGroup = page.getByTestId('dashboard-links-group-Social');
    const contentGroup = page.getByTestId('dashboard-links-group-Content');

    await expect(professionalGroup).toBeVisible();
    await expect(socialGroup).toBeVisible();
    await expect(contentGroup).toBeVisible();
    await expect(
      professionalGroup.getByTestId('dashboard-links-list-Professional'),
    ).toBeVisible();

    const professionalLabels = await professionalGroup
      .getByTestId('dashboard-link-label')
      .allTextContents();
    expect(professionalLabels).toEqual(['GitHub', 'LinkedIn']);

    const toggle = professionalGroup.getByRole('button', {
      name: /professional links/i,
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
