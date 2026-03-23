import { expect, type Page } from '@playwright/test';
import { USER_ID } from '../utils/auth';

export const STUB_PROFILE_WITH_RESUME = {
  id: USER_ID,
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: null,
  nerd_creds: { skills: ['Testing'] },
  socials: [],
  industries: null,
  resume_url:
    'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.pdf',
};

/** Register route AFTER stubAppSurface so this profile (with resume_url) wins. */
export async function stubProfilesRestWithResume(page: Page): Promise<void> {
  await page.route('**/rest/v1/profiles*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([STUB_PROFILE_WITH_RESUME]),
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

export async function gotoDashboardExpectPortfolioShowcase(
  page: Page,
): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-main')).toBeVisible({
    timeout: 35_000,
  });
  await expect(
    page.getByText('PORTFOLIO SHOWCASE', { exact: true }),
  ).toBeVisible({
    timeout: 30_000,
  });
}
