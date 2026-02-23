import { expect, test, type Page } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function mockSessionPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'admin@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle: 'admin', full_name: 'Admin' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSession(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
  }, payload);
}

test.describe('Admin resume thumbnail operations', () => {
  test('admin can view failures and trigger retry/backfill', async ({
    page,
  }) => {
    await seedSignedInSession(page);

    let retryCalled = false;
    let backfillCalled = false;

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true),
      });
    });

    await page.route(
      '**/api/admin/resume-thumbnails/summary',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              pending: 1,
              complete: 4,
              failed: 1,
              totalWithResume: 6,
              recentFailures: [
                {
                  profileId: USER_ID,
                  handle: 'member',
                  error: 'renderer timeout',
                  updatedAt: new Date().toISOString(),
                },
              ],
              backfillLock: null,
              latestBackfillRuns: [
                {
                  id: 'run-row-1',
                  action: 'RESUME_THUMBNAIL_BACKFILL_COMPLETED',
                  runId: 'run-123',
                  attempted: 2,
                  completed: 2,
                  failed: 0,
                  durationMs: 42,
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          }),
        });
      },
    );

    await page.route(
      '**/api/admin/resume-thumbnails/failures**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: [
              {
                profileId: USER_ID,
                handle: 'member',
                resumeUrl: 'https://example.com/member/resume.docx',
                error: 'renderer timeout',
                status: 'failed',
                updatedAt: new Date().toISOString(),
              },
            ],
            meta: { total: 1, limit: 50, offset: 0 },
          }),
        });
      },
    );

    await page.route(
      '**/api/admin/resume-thumbnails/runs?**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: [
              {
                id: 'run-row-1',
                actorEmail: 'admin@example.com',
                action: 'RESUME_THUMBNAIL_BACKFILL_COMPLETED',
                runId: 'run-123',
                attempted: 2,
                completed: 2,
                failed: 0,
                durationMs: 42,
                createdAt: new Date().toISOString(),
              },
            ],
            meta: { total: 1, limit: 25, offset: 0 },
          }),
        });
      },
    );

    await page.route(
      '**/api/admin/resume-thumbnails/runs/run-123',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              runId: 'run-123',
              events: [
                {
                  id: 'evt-1',
                  actorEmail: 'admin@example.com',
                  action: 'RESUME_THUMBNAIL_BACKFILL_COMPLETED',
                  createdAt: new Date().toISOString(),
                  meta: {
                    attempted: 2,
                    completed: 2,
                    failed: 0,
                    failedProfiles: [],
                  },
                },
              ],
            },
          }),
        });
      },
    );

    await page.route('**/api/admin/resume-thumbnails/retry', async (route) => {
      retryCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { status: 'complete' } }),
      });
    });

    await page.route(
      '**/api/admin/resume-thumbnails/backfill',
      async (route) => {
        backfillCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              runId: 'run-xyz',
              attempted: 1,
              completed: 1,
              failed: 0,
              durationMs: 21,
            },
          }),
        });
      },
    );

    await page.goto('/admin/resume-thumbnails');
    await expect(page).toHaveURL(/\/admin\/resume-thumbnails/);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: 'Resume Thumbnail Ops' }),
    ).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('@member')).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect.poll(() => retryCalled).toBe(true);

    await page.getByLabel('Backfill Batch Size').fill('10');
    await page.getByRole('button', { name: 'Run Backfill' }).click();
    await expect.poll(() => backfillCalled).toBe(true);
    await expect(page.getByText(/Backfill .* complete in/i)).toBeVisible();

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByText('Run Details')).toBeVisible();
  });
});
