import { expect, test, type Page } from './fixtures';
import { stubAppSurface } from './utils/stubAppSurface';

async function openDonateModal(page: Page) {
  await stubAppSurface(page);
  await page.goto('/about', { waitUntil: 'domcontentloaded' });

  const footer = page.getByTestId('site-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();

  const donateButton = footer.getByTestId('footer-donate-link');
  await donateButton.click();

  const dialog = page.getByRole('dialog', { name: 'Donate to WRDLNKDN' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Footer donate modal', () => {
  test('opens a donate modal with URL, copy action, QR code, and ESC close', async ({
    page,
  }) => {
    const dialog = await openDonateModal(page);

    const bodyOverflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflow,
    );
    expect(bodyOverflow).toBe('hidden');

    const donateUrl = dialog.getByTestId('footer-donate-modal-url');
    await expect(donateUrl).toHaveAttribute(
      'href',
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );
    await expect(donateUrl).toHaveAttribute('target', '_blank');
    await expect(donateUrl).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(donateUrl).toHaveText(
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );

    const qrImage = dialog.getByTestId('footer-donate-qr-image');
    await expect(qrImage).toBeVisible();
    await expect(qrImage).toHaveAttribute(
      'alt',
      'QR code for donating to WRDLNKDN',
    );

    const qrLink = dialog.getByTestId('footer-donate-qr-link');
    await expect(qrLink).toHaveAttribute(
      'href',
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );

    await dialog.getByTestId('footer-donate-copy-button').click();
    await expect(dialog.getByTestId('footer-donate-copy-feedback')).toHaveText(
      'Donation link copied.',
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('stays readable on mobile without overflowing the viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openDonateModal(page);

    const qrImage = dialog.getByTestId('footer-donate-qr-image');
    await expect(qrImage).toBeVisible();

    const dialogMetrics = await dialog.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));

    expect(dialogMetrics.scrollHeight).toBeLessThanOrEqual(
      dialogMetrics.clientHeight + 1,
    );
    expect(dialogMetrics.scrollWidth).toBeLessThanOrEqual(
      dialogMetrics.clientWidth + 1,
    );

    await dialog.getByLabel('Close donate modal').click();
    await expect(dialog).toBeHidden();
  });
});
