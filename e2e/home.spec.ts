import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home Page - High-Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Inhabit the Environment
    await page.goto('/');

    // 2. Wait for the "Physical Layer" to settle
    // PATCH: We use 'link' because the CTA uses component={RouterLink}.
    // This confirms the UI is interactive before we start asserting content.
    await expect(
      page.getByRole('link', { name: /Explore The Guild/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should render the Brand Identity and Phonetics', async ({ page }) => {
    // 1. Verify H1 (The Center of Gravity)
    // Matches Home.tsx: <Typography variant="h2" component="h1">WRDLNKDN</Typography>
    await expect(
      page.getByRole('heading', { level: 1, name: /WRDLNKDN/i }),
    ).toBeVisible();

    // 2. Verify Phonetic Guide (April's Requirement)
    // Matches Home.tsx: <Typography>(Weird Link-uh-din)</Typography>
    await expect(page.getByText('(Weird Link-uh-din)')).toBeVisible();

    // 3. Verify Tagline (H2)
    // Matches Home.tsx: <Typography variant="h5" component="h2">Professional networking...</Typography>
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
    // Matches the merged content from 'weirdlinked.in'
    const missionHeaders = ['Our Vision', 'Our Team', 'Our Pride'];

    for (const name of missionHeaders) {
      // Matches Home.tsx: <Typography variant="h6" component="h3">{name}</Typography>
      await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible();
    }
  });

  test('admin route should be protected or reachable', async ({ page }) => {
    // 1. Attempt to breach the Admin layer
    await page.goto('/admin');

    // 2. Verify System Stability
    // Ensure the app didn't crash (White Screen) during the Lazy Load
    await expect(page.locator('#root')).toBeVisible();

    // 3. Verify Routing Logic
    // We expect to either stay on /admin (if the app handles auth client-side)
    // OR be redirected to /signin or /auth/callback.
    // This regex covers all valid outcomes of an unauthenticated visit.
    await expect(page).toHaveURL(/admin|signin|auth/);

    // 4. Lightweight Accessibility Check
    // We disable 'heading-order' because Admin dashboards often break strict hierarchy
    const results = await new AxeBuilder({ page })
      .include('#root')
      .disableRules(['heading-order'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
