/**
 * E2E tests for Issue #609:
 *   FEATURE: Group Links by Category, Alphabetize Links,
 *   and Restrict Rendering to Identity Section (Profile + Dashboard)
 *
 * Covers:
 *   1. Dashboard – links render inside Identity section (not Portfolio)
 *   2. Dashboard – links are grouped by category headings
 *   3. Dashboard – links within each category are alphabetized
 *   4. Dashboard – category groups are collapsible (expanded by default)
 *   5. Public Profile – links render inside Identity section (not Portfolio)
 *   6. Public Profile – links are grouped and alphabetized
 *   7. Edit Links modal – current links list is alphabetized per category
 *   8. No regression: Manage Links modal behavior is unchanged
 */

import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

// ---------------------------------------------------------------------------
// Shared fixture: profile with links in multiple categories
// Stub data lives in auth.ts fixture profiles:
//   Professional: GitHub (order=2), LinkedIn (order=0), Stack Overflow (order=1)
//   Social:       Instagram (order=1), Discord (order=0)
//   Content:      YouTube (order=1), Blog (order=0)
// Expected alpha order per category:
//   Professional → GitHub, LinkedIn, Stack Overflow
//   Social       → Discord, Instagram
//   Content      → Blog, YouTube
// ---------------------------------------------------------------------------

test.describe('Issue #609 – Grouped, alphabetized links in Identity', () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);
  });

  // -------------------------------------------------------------------------
  // Dashboard surface
  // -------------------------------------------------------------------------

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    });

    test('links render inside Identity section, not inside Portfolio section', async ({
      page,
    }) => {
      // Identity section: the IdentityHeader wrapper
      const identitySection = page.getByTestId('identity-header');
      // Portfolio section: the Portfolio <Paper>
      const portfolioSection = page.getByTestId('portfolio-section');

      // At least one link must be visible inside Identity
      await expect(identitySection.getByRole('link').first()).toBeVisible();

      // No link rows should exist inside the Portfolio Paper's LINKS block
      await expect(
        portfolioSection.getByTestId('dashboard-links-block'),
      ).not.toBeAttached();
    });

    test('links section header reads "LINKS" and is inside Identity', async ({
      page,
    }) => {
      const identitySection = page.getByTestId('identity-header');
      await expect(
        identitySection.getByText('LINKS', { exact: true }),
      ).toBeVisible();
    });

    test('LINKS section is expanded by default', async ({ page }) => {
      // The collapsible content must be visible without interaction
      const identitySection = page.getByTestId('identity-header');
      await expect(identitySection.getByRole('link').first()).toBeVisible();
    });

    test('LINKS section can be collapsed and re-expanded', async ({ page }) => {
      const identitySection = page.getByTestId('identity-header');
      const toggleBtn = identitySection.getByRole('button', {
        name: /links/i,
      });

      // Collapse
      await toggleBtn.click();
      await expect(identitySection.getByRole('link').first()).not.toBeVisible();

      // Re-expand
      await toggleBtn.click();
      await expect(identitySection.getByRole('link').first()).toBeVisible();
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

      // Grab all link text within the Professional group
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
      // "Other" category has no links in the fixture
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
      await page.reload();
      await page.waitForLoadState('networkidle');

      const identitySection = page.getByTestId('identity-header');
      await expect(identitySection.getByRole('link').first()).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Public Profile surface
  // -------------------------------------------------------------------------

  test.describe('Public Profile', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the public-facing profile of the seeded test user
      await page.goto('/p/h~test-user-with-links');
      await page.waitForLoadState('networkidle');
    });

    test('links render inside Identity section on Profile', async ({
      page,
    }) => {
      const identitySection = page.getByTestId('identity-header');
      await expect(identitySection.getByRole('link').first()).toBeVisible();
    });

    test('links do NOT render inside Portfolio section on Profile', async ({
      page,
    }) => {
      const portfolioSection = page.getByTestId('portfolio-section');
      await expect(
        portfolioSection.getByTestId('profile-links-widget'),
      ).not.toBeAttached();
    });

    test('LINKS collapsible header is present in Identity', async ({
      page,
    }) => {
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

    test('LINKS section is expanded by default on Profile', async ({
      page,
    }) => {
      const identitySection = page.getByTestId('identity-header');
      await expect(identitySection.getByRole('link').first()).toBeVisible();
    });

    test('LINKS section can be collapsed on Profile', async ({ page }) => {
      const identitySection = page.getByTestId('identity-header');
      const toggleBtn = identitySection.getByRole('button', { name: /links/i });
      await toggleBtn.click();
      await expect(identitySection.getByRole('link').first()).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Edit Links modal — alphabetized current links list
  // -------------------------------------------------------------------------

  test.describe('Edit Links modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Open the Manage Links modal via Profile menu
      await page.getByRole('button', { name: /profile/i }).click();
      await page.getByRole('menuitem', { name: /add or edit links/i }).click();
      await expect(
        page.getByRole('dialog', { name: /manage links/i }),
      ).toBeVisible();
    });

    test('CURRENT LINKS section is grouped by category', async ({ page }) => {
      const dialog = page.getByRole('dialog', { name: /manage links/i });
      await expect(dialog.getByText('PROFESSIONAL')).toBeVisible();
      await expect(dialog.getByText('SOCIAL')).toBeVisible();
    });

    test('links within each category are alphabetized in Edit Links', async ({
      page,
    }) => {
      const dialog = page.getByRole('dialog', { name: /manage links/i });

      // Professional group inside the dialog
      const profGroup = dialog.getByTestId('edit-link-group-Professional');
      const linkLabels = await profGroup
        .getByTestId('edit-link-label')
        .allTextContents();

      const sorted = [...linkLabels].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      );
      expect(linkLabels).toEqual(sorted);
    });

    test('adding a new link places it in the correct alphabetical position', async ({
      page,
    }) => {
      const dialog = page.getByRole('dialog', { name: /manage links/i });

      // Add a new Professional link: Behance (should appear before GitHub alpha)
      await dialog
        .getByRole('combobox', { name: /category/i })
        .selectOption('Professional');
      await dialog
        .getByRole('combobox', { name: /platform/i })
        .selectOption('Behance');
      await dialog
        .getByPlaceholder(/https:\/\/example\.com/i)
        .fill('https://behance.net/testuser');
      await dialog.getByRole('button', { name: /\+ add to list/i }).click();

      const profGroup = dialog.getByTestId('edit-link-group-Professional');
      const linkLabels = await profGroup
        .getByTestId('edit-link-label')
        .allTextContents();

      // "Behance" must appear before "GitHub"
      const behanceIdx = linkLabels.findIndex((t) =>
        t.toLowerCase().includes('behance'),
      );
      const githubIdx = linkLabels.findIndex((t) =>
        t.toLowerCase().includes('github'),
      );
      expect(behanceIdx).toBeLessThan(githubIdx);
    });

    test('modal close / cancel behavior is unchanged (regression)', async ({
      page,
    }) => {
      const dialog = page.getByRole('dialog', { name: /manage links/i });

      // Close via X button — no unsaved changes, should close immediately
      await dialog.getByRole('button', { name: /close/i }).click();
      await expect(dialog).not.toBeVisible();
    });

    test('unsaved changes prompt still appears when editing without saving (regression)', async ({
      page,
    }) => {
      const dialog = page.getByRole('dialog', { name: /manage links/i });

      // Dirty the form
      await dialog
        .getByRole('combobox', { name: /category/i })
        .selectOption('Social');

      // Try to close
      await dialog.getByRole('button', { name: /close/i }).click();

      // Unsaved changes dialog must appear
      await expect(
        page.getByRole('dialog', { name: /unsaved changes/i }),
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Regression: no links in Portfolio section (both empty + non-empty states)
  // -------------------------------------------------------------------------

  test.describe('Portfolio section regression', () => {
    test('Portfolio section has no LINKS block when profile has links', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const portfolioSection = page.getByTestId('portfolio-section');
      await expect(
        portfolioSection.getByTestId('dashboard-links-block'),
      ).not.toBeAttached();
    });

    test('Portfolio section has no LINKS block in empty portfolio state', async ({
      page,
    }) => {
      // The top-level beforeEach seeds a user with links but the stub profile
      // has no resume_url and no projects, so this is already the empty-portfolio state.
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const portfolioSection = page.getByTestId('portfolio-section');
      await expect(
        portfolioSection.getByTestId('dashboard-links-block'),
      ).not.toBeAttached();
    });
  });
});
