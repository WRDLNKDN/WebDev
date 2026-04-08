import { expect, type Locator, type Page } from '@playwright/test';
import { seedSignedInSession } from './auth';
import { stubAppSurface } from './stubAppSurface';

/**
 * Feed → post composer → GIF picker. Single entry point (avoids split arrange/open duplication).
 */
export async function openGifPickerFromFeedComposer(
  page: Page,
): Promise<Locator> {
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
  return gifDialog;
}

/** Product policy: no member-facing GIPHY tier controls (G / PG-13 / Strict / “Content:”). */
export async function expectNoGiphyRatingTierControls(
  gifDialog: Locator,
): Promise<void> {
  await expect(gifDialog.getByRole('button', { name: /^G$/ })).toHaveCount(0);
  await expect(gifDialog.getByRole('button', { name: /^PG-13$/i })).toHaveCount(
    0,
  );
  await expect(
    gifDialog.getByRole('button', { name: /^Strict$/i }),
  ).toHaveCount(0);
  await expect(gifDialog.getByText(/^Content:/)).toHaveCount(0);
}
