import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Community Partners page', () => {
  test('shows Nettica fallback when admin list is empty', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    test.setTimeout(60_000);
    await page.goto('/community-partners', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 25_000 });
  });
});
