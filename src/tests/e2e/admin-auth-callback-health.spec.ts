import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';

test.describe('Admin auth callback health page', () => {
  test('renders auth callback health panel content shape', async ({
    page,
    context,
  }) => {
    const { stubAdminRpc } = await seedSignedInSession(context, {
      isAdmin: true,
    });
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

    await page.goto('/admin/auth-callback-health');

    await expect(
      page.getByTestId('admin-auth-callback-health-panel'),
    ).toBeVisible({ timeout: 15000 });
  });
});
