import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Admin resume thumbnail surface deprecation', () => {
  test('admin no longer sees Resume Thumbnails nav and route redirects', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const { stubAdminRpc } = await seedSignedInSession(context, {
      isAdmin: true,
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/resume thumbnails/i)).toHaveCount(0);

    await page.goto('/admin/resume-thumbnails', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).not.toHaveURL(/resume-thumbnails$/);
  });
});
