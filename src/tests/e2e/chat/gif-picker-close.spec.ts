import { expect, test } from '../fixtures';
import {
  expectNoGiphyRatingTierControls,
  openGifPickerFromFeedComposer,
} from '../utils/gifPickerFeedHelpers';

test.describe('GIF picker modal', () => {
  test('has close button and closes on Close click', async ({ page }) => {
    test.setTimeout(60_000);
    const gifDialog = await openGifPickerFromFeedComposer(page);
    await expectNoGiphyRatingTierControls(gifDialog);

    await page.getByRole('button', { name: /close/i }).click();
    await expect(gifDialog).not.toBeVisible({ timeout: 3_000 });
  });

  test('closes on Escape key', async ({ page }) => {
    test.setTimeout(60_000);
    const gifDialog = await openGifPickerFromFeedComposer(page);
    await expectNoGiphyRatingTierControls(gifDialog);

    await page.keyboard.press('Escape');
    await expect(gifDialog).not.toBeVisible({ timeout: 3_000 });
  });
});
