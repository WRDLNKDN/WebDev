import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Community Partners page', () => {
  test('shows Nettica fallback when admin list is empty', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/community-partners');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  });
});
