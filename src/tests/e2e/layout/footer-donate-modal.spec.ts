import { expect, test, type Page } from '../fixtures';
import { stubAppSurface } from '../utils/stubAppSurface';

async function getDonateLink(page: Page) {
  await stubAppSurface(page);
  await page.goto('/about', { waitUntil: 'domcontentloaded' });

  const footer = page.getByTestId('site-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();

  const donateLink = footer.getByTestId('footer-donate-link');
  await expect(donateLink).toBeVisible();
  return donateLink;
}

test.describe('Footer donate link', () => {
  test('opens donate modal with QR code and payment link', async ({ page }) => {
    const donateButton = await getDonateLink(page);
    await expect(donateButton).toHaveAttribute(
      'aria-label',
      'Donate to WRDLNKDN',
    );
    await expect(
      page.getByRole('dialog', { name: 'Donate to WRDLNKDN' }),
    ).toHaveCount(0);

    await donateButton.click();

    const dialog = page.getByRole('dialog', { name: 'Donate to WRDLNKDN' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('img', { name: 'Donate QR code' }),
    ).toBeVisible();
    const payLink = dialog.getByRole('link', {
      name: /pay online/i,
    });
    const donateUrl =
      'https://0ce9348c-39fb-4c78-88f3-cde23f784fad.paylinks.godaddy.com/d43df879-0ba0-4c34-9de0-878';
    await expect(payLink).toHaveAttribute('href', donateUrl);
    await expect(payLink).toHaveAttribute('target', '_blank');

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      payLink.click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(donateUrl);
    await popup.close();
  });

  test('stays readable on mobile without overflowing the viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const donateLink = await getDonateLink(page);
    await expect(donateLink).toBeVisible();

    const footer = page.getByTestId('site-footer');
    const footerMetrics = await footer.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));

    expect(footerMetrics.scrollHeight).toBeLessThanOrEqual(
      footerMetrics.clientHeight + 1,
    );
    expect(footerMetrics.scrollWidth).toBeLessThanOrEqual(
      footerMetrics.clientWidth + 1,
    );
  });
});
