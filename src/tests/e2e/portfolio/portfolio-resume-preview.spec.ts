import { expect, test } from '../fixtures';

test.describe('Portfolio resume preview modal', () => {
  test('opens an in-app preview for resume artifacts and closes without navigation', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const resumeFileName = 'April Drake TPM Resume 26.docx';
    const resumeUrl =
      'https://example.supabase.co/storage/v1/object/public/resumes/user-id/april-drake-resume.docx';
    const payload = {
      profile: {
        id: '44444444-4444-4444-8444-444444444444',
        display_name: 'Preview Member',
        tagline: 'Builder',
        avatar: null,
        nerd_creds: {
          resume_file_name: resumeFileName,
          resume_thumbnail_status: 'failed',
        },
        socials: [],
        resume_url: resumeUrl,
      },
      portfolio: [],
    };

    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      },
    );

    await page.goto('/p/resume-preview-token', {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', { name: 'Preview Member', exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Open document' }).click();

    const previewDialog = page.getByTestId('portfolio-preview-modal');
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByText(resumeFileName)).toBeVisible();
    await expect(page).toHaveURL(/\/p\/resume-preview-token$/);

    const previewFrame = page.getByTestId('portfolio-preview-frame');
    await expect(previewFrame).toBeVisible();
    await expect(previewFrame).toHaveAttribute(
      'src',
      new RegExp(
        `^https://view\\.officeapps\\.live\\.com/op/embed\\.aspx\\?src=${encodeURIComponent(resumeUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      ),
    );

    await expect(
      previewDialog.getByRole('link', { name: 'Download artifact' }),
    ).toHaveAttribute('href', resumeUrl);

    await page.keyboard.press('Escape');
    await expect(previewDialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/p\/resume-preview-token$/);
  });
});
