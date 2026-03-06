import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { USER_ID } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

// fixme: authenticated E2E (session/profile stub) fails; unit tests cover resume delete logic
test.describe.fixme('Dashboard resume delete', () => {
  const STUB_PROFILE_WITH_RESUME = {
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
    resume_url:
      'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.pdf',
  };

  test('Resume card shows trash icon and confirmation dialog', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    // Register BEFORE stubAppSurface so this wins (Playwright: first match wins)
    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([STUB_PROFILE_WITH_RESUME]),
        });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });
    await stubAppSurface(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible(
      { timeout: 10_000 },
    );
    const deleteResumeBtn = page.getByRole('button', {
      name: /delete resume/i,
    });
    await expect(deleteResumeBtn).toBeVisible({ timeout: 10_000 });

    await deleteResumeBtn.click();
    const confirmDialog = page.getByRole('dialog').filter({
      hasText: /delete resume/i,
    });
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/are you sure you want to delete your resume/i),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /cancel/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^delete$/i }).first(),
    ).toBeVisible();

    await page
      .getByRole('button', { name: /cancel/i })
      .first()
      .click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 3_000 });
  });
});
