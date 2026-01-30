import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Inhabit the Environment
    await page.goto('/');
  });

  test('should render the brand and primary navigation targets', async ({
    page,
  }) => {
    // 1. Verify the Brand Label (Visual Identity)
    // Located in the AppBar header landmark
    const brandLabel = page.getByRole('banner').getByText('WRDLNKDN');
    await expect(brandLabel).toBeVisible();

    // 2. Verify the Main Hook (The Semantic H1)
    // This is our primary 'Center of Gravity' for SEO and Screen Readers
    await expect(
      page.getByRole('heading', { name: 'WRDLNKDN', level: 1 }),
    ).toBeVisible();

    // 3. Verify the Tagline (The Semantic H2)
    // Visually h5 for style, but semantically h2 for hierarchy integrity
    await expect(
      page.getByRole('heading', {
        name: /Professional networking, but/i,
        level: 2,
      }),
    ).toBeVisible();
  });

  test('should display the community invitation (System Audit Info)', async ({
    page,
  }) => {
    // 1. Verify the Guild Invitation
    // The specific text string we added to the unauthenticated state
    const invitation = page
      .getByText(/Join the Guild of the Verified Generalists/i)
      .first();
    await expect(invitation).toBeVisible();

    // 2. Verify Semantic Compliance
    // Ensures the caption typography is applied for proper visual hierarchy
    await expect(invitation).toHaveClass(/MuiTypography-caption/);
  });

  test('should render the Mission Grid columns (Source: weirdlinked.in)', async ({
    page,
  }) => {
    // PATCH: Updated headers to match the latest 'Who We Are' content injection

    // Column 1: Our Vision
    await expect(
      page.getByRole('heading', { name: 'Our Vision', level: 3 }),
    ).toBeVisible();

    // Column 2: Our Team
    await expect(
      page.getByRole('heading', { name: 'Our Team', level: 3 }),
    ).toBeVisible();

    // Column 3: Our Pride
    await expect(
      page.getByRole('heading', { name: 'Our Pride', level: 3 }),
    ).toBeVisible();
  });
});
