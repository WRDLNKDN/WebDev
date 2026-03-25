import { expect, test, type Page, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { fulfillPostgrest } from '../utils/postgrestFulfill';
import { stubAppSurface } from '../utils/stubAppSurface';

const DOCX_FILE = {
  name: 'E2E-Resume.docx',
  mimeType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  buffer: Buffer.from('e2e-stub-docx'),
} as const;

const resumePdfPublicUrl = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume.pdf`;
const resumePdfPreviewSrc = `${resumePdfPublicUrl}#toolbar=0&navpanes=0`;
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
  const { stubAdminRpc } = await seedSignedInSession(page.context(), {
    handle: 'member',
  });
  await stubAdminRpc(page);
  await stubAppSurface(page);

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

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByText('PORTFOLIO SHOWCASE', { exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /add resume or project/i }).click();
    await page.getByRole('menuitem', { name: /\+ add resume/i }).click();

    const fileInput = page
      .locator('input[type="file"][accept*=".docx"]')
      .first();
    await fileInput.setInputFiles(DOCX_FILE);

    await expect(page.getByTestId('resume-file-name')).toContainText(
      DOCX_FILE.name,
      { timeout: 25_000 },
    );

    const openDoc = page.getByRole('button', { name: 'Open document' });
    await expect(openDoc).toBeVisible({ timeout: 15_000 });
    await openDoc.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('portfolio-preview-frame')).toHaveAttribute(
      'src',
      resumePdfPreviewSrc,
    );
  });

  test('failed generate-thumbnail shows preview warning toast', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await setupDashboardResumeStubs(page, { thumbnailMode: '422' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole('button', { name: /add resume or project/i }).click();
    await page.getByRole('menuitem', { name: /\+ add resume/i }).click();

    const fileInput = page
      .locator('input[type="file"][accept*=".docx"]')
      .first();
    await fileInput.setInputFiles(DOCX_FILE);

    await expect(
      page.getByRole('alert').filter({ hasText: /Preview was not generated/i }),
    ).toBeVisible({ timeout: 25_000 });
  });
});
