import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render the brand and primary navigation targets', async ({
    page,
  }) => {
    // 1. Verify the Brand
    // It is now a visual label inside the Header (banner), not a semantic H1.
    const brand = page.getByRole('banner').getByText('WRDLNKDN');
    await expect(brand).toBeVisible();

    // 2. Verify the Main Hook (The true H1)
    await expect(
      page.getByRole('heading', { name: 'WeirdLinkedIn', level: 1 }),
    ).toBeVisible();

    // 3. Verify the Subtitle (The semantic H2)
    // Note: It visually looks like an h5, but semantically acts as h2
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
    // 1. Verify the Caption
    // We replaced the "Admin Warning" with the "Guild Invitation"
    const tip = page
      .getByText(/Join the Guild of the Verified Generalists/i)
      .first();
    await expect(tip).toBeVisible();

    // 2. Verify Semantic Styling
    // It should still use the Caption typography class
    await expect(tip).toHaveClass(/MuiTypography-caption/);
  });

  test('should render the Verified Generalist grid columns', async ({
    page,
  }) => {
    // 1. Verify the Grid Headers (Semantic H3s)
    await expect(
      page.getByRole('heading', { name: 'Verified Profiles', level: 3 }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Human OS', level: 3 }),
    ).toBeVisible();
  });
});
