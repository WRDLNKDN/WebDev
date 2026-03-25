import { expect, test } from '../fixtures';

/**
 * Share profile route /p/:shareToken uses environment base URL and resolves to PublicProfilePage.
 * Invalid token shows NotFoundPage (404). Proves the route exists and is not hardcoded to one domain.
 */
test.describe('Share profile route', () => {
  test('/p/:shareToken route renders PublicProfilePage (not found for invalid token)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null),
        });
      },
    );
    await page.goto('/p/invalid-test-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('404')).toBeVisible({ timeout: 25_000 });
  });

  test('public profile with socials shows LINKS in Identity with collapsible groups', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const payload = {
      profile: {
        id: '11111111-1111-4111-8111-111111111111',
        display_name: 'Test Member',
        tagline: null,
        avatar: null,
        nerd_creds: {},
        socials: [
          {
            id: 'link-1',
            category: 'Professional',
            platform: 'LinkedIn',
            url: 'https://linkedin.com/in/test',
            isVisible: true,
            order: 0,
          },
        ],
        resume_url: null,
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
    await page.goto('/p/valid-token-with-links', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Test Member', exact: true }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('LINKS', { exact: true })).toBeVisible({
      timeout: 5_000,
    });
    const professionalGroup = page.getByTestId('link-group-Professional');
    await expect(professionalGroup).toBeVisible({ timeout: 5_000 });
    await expect(
      professionalGroup.getByRole('link', { name: /linkedin/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /portfolio/i }),
    ).not.toBeAttached();
  });

  test('public profile resume card shows stored filename with tooltip', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const resumeFileName =
      'Nicholas_Clark_Senior_Engineer_Resume_2026_Final_Version.docx';
    const payload = {
      profile: {
        id: '22222222-2222-4222-8222-222222222222',
        display_name: 'Resume Member',
        tagline: 'Builder',
        avatar: null,
        nerd_creds: {
          resume_file_name: resumeFileName,
          resume_thumbnail_status: 'failed',
        },
        socials: [],
        resume_url:
          'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.docx',
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
    await page.goto('/p/valid-token-with-resume', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Resume Member', exact: true }),
    ).toBeVisible({
      timeout: 20_000,
    });
    const fileNameTrigger = page.getByTestId('resume-file-name');
    await expect(fileNameTrigger).toContainText('Nicholas_Clark_Senior_');
    await expect(fileNameTrigger).toHaveAttribute('aria-label', resumeFileName);
    await fileNameTrigger.hover();
    await expect(page.getByRole('tooltip')).toContainText(resumeFileName);
    await fileNameTrigger.focus();
    await expect(page.getByRole('tooltip')).toContainText(resumeFileName);
  });

  test('public profile resume card falls back to Resume.pdf when filename is unavailable', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const payload = {
      profile: {
        id: '33333333-3333-4333-8333-333333333333',
        display_name: 'Resume Fallback Member',
        tagline: 'Builder',
        avatar: null,
        nerd_creds: {},
        socials: [],
        resume_url:
          'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.pdf',
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
    await page.goto('/p/valid-token-with-resume-fallback', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', {
        name: 'Resume Fallback Member',
        exact: true,
      }),
    ).toBeVisible({
      timeout: 20_000,
    });
    const fileNameTrigger = page.getByTestId('resume-file-name');
    await expect(fileNameTrigger).toHaveText('Resume.pdf');
    await expect(fileNameTrigger).toHaveAttribute('aria-label', 'Resume.pdf');
  });
});
