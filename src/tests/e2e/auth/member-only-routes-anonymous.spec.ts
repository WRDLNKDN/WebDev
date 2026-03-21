import { expect, test, type Page } from '../fixtures';

/**
 * Anonymous users must not stay on member app routes; `RequireOnboarded` sends
 * no session → `/` (UAT/PROD/local — no env bypass).
 *
 * Some routes nest `RequireFeatureFlag` first; end state for guests is still `/`
 * (e.g. via fallback → `/feed` → guard).
 */
const MEMBER_ONLY_PATHS: readonly string[] = [
  '/feed',
  '/saved',
  '/groups',
  '/dashboard',
  '/dashboard/notifications',
  '/chat-full',
  '/chat-full/00000000-0000-4000-8000-000000000001',
  '/chat',
  '/chat/00000000-0000-4000-8000-000000000001',
  '/weirdling/create',
  '/submit',
  '/directory',
  '/events',
  '/events/00000000-0000-4000-8000-000000000001',
];

test.describe('Member-only routes (anonymous)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
  });

  const expectHomePath = async (page: Page) => {
    await expect(page).toHaveURL((url) => new URL(url).pathname === '/', {
      timeout: 25_000,
    });
  };

  for (const path of MEMBER_ONLY_PATHS) {
    test(`redirects ${path} when not signed in`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expectHomePath(page);
    });
  }
});
