import { expect, type Page, type Route } from '@playwright/test';
import { USER_ID } from './auth';
import { fulfillPostgrest } from './postgrestFulfill';
import { prepareSignedInDashboardSurface } from './signedInDashboardSurface';

export const RESUME_E2E_PDF_PUBLIC_URL = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume.pdf`;
export const RESUME_E2E_THUMB_PUBLIC_URL = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume-thumbnail.jpg`;
export const RESUME_E2E_ORIGINAL_PUBLIC_URL = `https://example.supabase.co/storage/v1/object/public/resumes/${USER_ID}/resume-original.docx`;

type ProfileRow = Record<string, unknown>;

async function fulfillProfilesGet(route: Route, row: ProfileRow) {
  await fulfillPostgrest(route, row);
}

function mergeProfilePatch(prev: ProfileRow, payload: ProfileRow): ProfileRow {
  const next: ProfileRow = { ...prev };
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'nerd_creds' && value && typeof value === 'object') {
      const prevNc = prev.nerd_creds;
      const valueRec = value as Record<string, unknown>;
      if (prevNc && typeof prevNc === 'object' && !Array.isArray(prevNc)) {
        next.nerd_creds = {
          ...(prevNc as Record<string, unknown>),
          ...valueRec,
        };
      } else {
        next.nerd_creds = { ...valueRec };
      }
    } else if (key !== 'nerd_creds') {
      next[key] = value;
    }
  }
  return next;
}

export async function setupDashboardResumeStubs(
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
        resume_url: RESUME_E2E_PDF_PUBLIC_URL,
        nerd_creds: {
          resume_thumbnail_status: 'complete',
          resume_thumbnail_url: RESUME_E2E_THUMB_PUBLIC_URL,
          resume_original_url: RESUME_E2E_ORIGINAL_PUBLIC_URL,
        },
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            status: 'complete',
            thumbnailUrl: RESUME_E2E_THUMB_PUBLIC_URL,
            resumePublicUrl: RESUME_E2E_PDF_PUBLIC_URL,
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
