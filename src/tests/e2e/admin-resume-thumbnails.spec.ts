import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Admin resume thumbnail surface deprecation', () => {
  test('admin no longer sees Resume Thumbnails nav and route redirects', async ({
    page,
  }) => {
    await seedSignedInSession(page, { isAdmin: true });
    await stubAppSurface(page);

    await page.goto('/admin');

    await expect(page.getByText(/resume thumbnails/i)).toHaveCount(0);

    await page.goto('/admin/resume-thumbnails');

    await expect(page).not.toHaveURL(/resume-thumbnails$/);
  });
});
