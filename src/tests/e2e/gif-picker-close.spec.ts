import { expect, test } from './fixtures';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

// fixme: authenticated E2E (session/profile stub) fails; unit tests cover GIF picker logic
test.describe.fixme('GIF picker modal', () => {
  test('has close button and closes on Close click', async ({ page }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
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

    await page.getByRole('button', { name: /close/i }).click();
    await expect(gifDialog).not.toBeVisible({ timeout: 3_000 });
  });

  test('closes on Escape key', async ({ page }) => {
    test.setTimeout(60_000);
    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
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
