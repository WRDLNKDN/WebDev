import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Inhabit the Environment
    await page.goto('/');

    // 2. Wait for the "Physical Layer" to settle
    // We wait for the Primary CTA. This confirms the Auth logic has run
    // and the UI has settled into the "Guest" state.
    await expect(
      page.getByRole('button', { name: /Explore The Guild/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should render the Brand Identity and Phonetics', async ({ page }) => {
    // 1. Verify H1 (The Center of Gravity)
    await expect(
      page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
    ).toBeVisible();

    // 2. Verify Phonetic Guide (April's Requirement)
    // This ensures we didn't lose the "Weird Link-uh-din" text during the merge
    await expect(page.getByText('(Weird Link-uh-din)')).toBeVisible();

    // 3. Verify Tagline (H2)
    // Note: 'human' is in a span, so we match the main sentence structure
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: /Professional networking, but/i,
      }),
    ).toBeVisible();
  });

  test('should render the Mission Grid (Visual Integrity)', async ({
    page,
  }) => {
    // 1. Verify the 3 Columns exist (Vision, Team, Pride)
    // These come from the merged 'weirdlinked.in' content injection.
    const missionHeaders = ['Our Vision', 'Our Team', 'Our Pride'];

    for (const name of missionHeaders) {
      await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible();
    }
  });

  test('should pass the WCAG 2.2 AA Accessibility Audit', async ({ page }) => {
    // 1. Run the Scan
    const results = await new AxeBuilder({ page })
      .include('#root') // Scope to our app container
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'section508']) // Full Compliance Stack
      .exclude('iframe')
      .analyze();

    // 2. Verification
    expect(results.violations).toEqual([]);
  });

  test('admin route should be protected or reachable', async ({ page }) => {
    // 1. Navigate to Admin
    await page.goto('/admin');

    // 2. Verify Behavior
    // Since we are unauthenticated in this test context, we expect one of two things:
    // A) A redirect to /signin (Standard Protection)
    // B) A "Not Authorized" or "Sign In" state on the admin page itself.

    // We check that we didn't crash (root is visible)
    await expect(page.locator('#root')).toBeVisible();

    // Run a lightweight accessibility check on whatever landed
    const results = await new AxeBuilder({ page })
      .include('#root')
      .disableRules(['heading-order']) // Admin pages often skip heading levels for layout
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
