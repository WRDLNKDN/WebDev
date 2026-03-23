import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  gotoDashboardExpectPortfolioShowcase,
  stubProfilesRestWithResume,
} from './dashboardResumeStubs';

test.describe('Dashboard resume delete', () => {
  test('Resume card shows trash icon and confirmation dialog', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubProfilesRestWithResume(page);

    await gotoDashboardExpectPortfolioShowcase(page);

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

  test('Resume card shows edit resume control when a resume exists', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stubProfilesRestWithResume(page);

    await gotoDashboardExpectPortfolioShowcase(page);

    await expect(
      page.getByRole('button', { name: /edit resume/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
