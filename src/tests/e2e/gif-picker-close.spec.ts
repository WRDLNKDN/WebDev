import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('GIF picker modal', () => {
  // fixme: feed requires auth/session stubs; "Start a post" may not render until stubs are fixed
  test.fixme(
    'has close button and closes on Close click',
    async ({ page, context }) => {
      test.setTimeout(45_000);
      await seedSignedInSession(context);
      await stubAppSurface(page);

      await page.goto('/feed', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 20_000,
      });

      // Open post composer
      await page.getByRole('button', { name: /start a post/i }).click();
      await expect(
        page.getByRole('dialog').filter({ hasText: /post/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Open GIF picker
      await page.getByRole('button', { name: /add gif/i }).click();
      const gifDialog = page.getByRole('dialog').filter({
        hasText: /choose a gif/i,
      });
      await expect(gifDialog).toBeVisible({ timeout: 5_000 });

      // Close via X button
      await page.getByRole('button', { name: /close/i }).click();
      await expect(gifDialog).not.toBeVisible({ timeout: 3_000 });
    },
  );

  test.fixme('closes on Escape key', async ({ page, context }) => {
    test.setTimeout(45_000);
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /start a post/i }).click();
    await expect(
      page.getByRole('dialog').filter({ hasText: /post/i }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /add gif/i }).click();
    const gifDialog = page.getByRole('dialog').filter({
      hasText: /choose a gif/i,
    });
    await expect(gifDialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(gifDialog).not.toBeVisible({ timeout: 3_000 });
  });
});
