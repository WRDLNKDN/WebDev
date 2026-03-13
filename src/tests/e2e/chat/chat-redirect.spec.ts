import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Chat redirect', () => {
  test('navigating to /chat?with=<user> does not crash and settles on chat/feed shell', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/chat?with=connected-user-1', {
      waitUntil: 'domcontentloaded',
    });

    await expect
      .poll(
        async () => ['/feed', '/chat'].includes(new URL(page.url()).pathname),
        { timeout: 30_000 },
      )
      .toBeTruthy();
    await expect(page.getByTestId('app-main')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('error-boundary-fallback')).toHaveCount(0);
  });
});
