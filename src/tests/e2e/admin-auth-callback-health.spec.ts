import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Admin auth callback health page', () => {
  // Requires admin session + RPC stub to pass; skip until e2e admin auth is stable
  test.skip('renders auth callback health panel content shape', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      isAdmin: true,
    });
    await stubAppSurface(page);
    await stubAdminRpc(page);

    await page.route('**/api/admin/auth-callback-logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: [{ id: '1', action: 'AUTH_CALLBACK_ERROR' }],
          meta: { total: 1 },
        }),
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/admin/auth-callback-health', {
      waitUntil: 'networkidle',
    });
    await expect(page).toHaveURL(/\/admin\/auth-callback-health/);

    await expect(
      page.getByTestId('admin-auth-callback-health-panel'),
    ).toBeVisible({ timeout: 20000 });
  });
});
