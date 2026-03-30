import { expect, test, type Page, type Route } from '../fixtures';
import { USER_ID } from '../utils/auth';
import {
  DASHBOARD_RESUME_DOCX_FIXTURE,
  openDashboardResumeDocxPicker,
} from '../utils/dashboardResumeDocxPicker';
import { fulfillPostgrest } from '../utils/postgrestFulfill';
import { prepareSignedInDashboardSurface } from '../utils/signedInDashboardSurface';

const resumePdfPublicUrl = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume.pdf`;
const resumeThumbPublicUrl = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume-thumbnail.jpg`;
const resumeOriginalPublicUrl = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume-original.docx`;

type ProfileRow = Record<string, unknown>;

async function fulfillProfilesGet(route: Route, row: ProfileRow) {
  await fulfillPostgrest(route, row);
}

function mergeProfilePatch(prev: ProfileRow, payload: ProfileRow): ProfileRow {
  const next: ProfileRow = { ...prev };
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'nerd_creds' && value && typeof value === 'object') {
      next.nerd_creds = {
        ...((prev.nerd_creds as object) ?? {}),
        ...(value as object),
      };
    } else if (key !== 'nerd_creds') {
      next[key] = value;
    }
  }
  return next;
}

async function setupDashboardResumeStubs(
  page: Page,
  options: {
    thumbnailMode: 'success' | '422';
  },
) {
  await prepareSignedInDashboardSurface(page, page.context());

  let profileRow: ProfileRow = {
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
    resume_url: null,
  };

  await page.route('**/rest/v1/portfolio_items*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0--1/0' },
        body: '[]',
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await fulfillProfilesGet(route, profileRow);
      return;
    }
    if (method === 'PATCH' || method === 'POST') {
      const payload = (route.request().postDataJSON() as ProfileRow) ?? {};
      profileRow = mergeProfilePatch(profileRow, payload);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: USER_ID }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/storage/v1/object/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.route('**/api/resumes/generate-thumbnail', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ status: 405, body: '{}' });
      return;
    }
    const reqJson = route.request().postDataJSON() as { storagePath?: string };
    expect(reqJson.storagePath).toBe(`${USER_ID}/resume-original.docx`);

    if (options.thumbnailMode === 'success') {
      profileRow = mergeProfilePatch(profileRow, {
        resume_url: resumePdfPublicUrl,
        nerd_creds: {
          resume_thumbnail_status: 'complete',
          resume_thumbnail_url: resumeThumbPublicUrl,
          resume_original_url: resumeOriginalPublicUrl,
        },
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            status: 'complete',
            thumbnailUrl: resumeThumbPublicUrl,
            resumePublicUrl: resumePdfPublicUrl,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 422,
        message: 'Thumbnail pipeline rejected (e2e stub)',
        code: 'UNPROCESSABLE_ENTITY',
        error: 'Thumbnail pipeline rejected (e2e stub)',
      }),
    });
  });
}

test.describe('Dashboard DOCX resume + generate-thumbnail (stubbed API)', () => {
  test('Word upload calls generate-thumbnail and surfaces PDF resume URL', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await setupDashboardResumeStubs(page, { thumbnailMode: 'success' });

    await openDashboardResumeDocxPicker(page);

    await expect(page.getByTestId('resume-file-name')).toContainText(
      DASHBOARD_RESUME_DOCX_FIXTURE.name,
      { timeout: 25_000 },
    );

    // Dashboard resume card omits onOpenPreview; open control is a direct PDF link (not the profile preview modal).
    const openDoc = page
      .getByTestId('dashboard-portfolio-showcase-section')
      .getByRole('link', { name: 'Open document' });
    await expect(openDoc).toBeVisible({ timeout: 15_000 });
    await expect(openDoc).toHaveAttribute('href', resumePdfPublicUrl);
  });

  test('failed generate-thumbnail shows preview warning toast', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await setupDashboardResumeStubs(page, { thumbnailMode: '422' });

    await openDashboardResumeDocxPicker(page);

    await expect(
      page.getByRole('alert').filter({ hasText: /Preview was not generated/i }),
    ).toBeVisible({ timeout: 25_000 });
  });
});
