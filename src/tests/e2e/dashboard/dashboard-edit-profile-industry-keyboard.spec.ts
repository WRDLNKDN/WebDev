import { expect, test } from '../fixtures';
import { USER_ID } from '../utils/auth';
import { prepareSignedInDashboardSurface } from '../utils/signedInDashboardSurface';

const PROFILE_WITH_CANONICAL_INDUSTRIES = {
  id: USER_ID,
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: 'Cloud and Infrastructure',
  niche_field: 'Platform Governance',
  industries: [
    {
      industry: 'Technology and Software',
      sub_industries: ['Cloud and Infrastructure'],
    },
  ],
  nerd_creds: { skills: ['Testing', 'Platform Strategy', 'DevSecOps'] },
  socials: [],
};

test.describe('Dashboard edit profile keyboard UX', () => {
  test('Enter commits a sub-industry chip and Escape closes the dialog', async ({
    page,
    context,
  }) => {
    await prepareSignedInDashboardSurface(page, context);

    await page.route('**/rest/v1/profiles*', async (route) => {
      const accept = route.request().headers()['accept'];
      const wantsSingleObject = Boolean(
        accept?.includes('application/vnd.pgrst.object+json'),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: wantsSingleObject
          ? JSON.stringify(PROFILE_WITH_CANONICAL_INDUSTRIES)
          : JSON.stringify([PROFILE_WITH_CANONICAL_INDUSTRIES]),
      });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    const profileMenuButton = page.getByRole('button', {
      name: /manage profile/i,
    });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click({ force: true });
    await page.getByRole('menuitem', { name: /edit profile/i }).click();

    const dialog = page.getByRole('dialog', { name: /edit.*profile/i });
    await expect(dialog).toBeVisible();

    const subIndustryInput = dialog.getByLabel('Sub-Industry').first();
    await subIndustryInput.click();
    await subIndustryInput.fill('web');
    await subIndustryInput.press('Enter');

    await expect(
      dialog.getByRole('button', { name: 'Web Development' }),
    ).toBeVisible();
    await expect(subIndustryInput).toHaveValue('');
    await expect(subIndustryInput).toBeFocused();
    await expect(
      dialog.getByText(
        'Added Web Development. Press Escape when you are done.',
      ),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
