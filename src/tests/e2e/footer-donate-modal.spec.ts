import { expect, test, type Page } from './fixtures';
import { stubAppSurface } from './utils/stubAppSurface';

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
  test('uses direct external donation link and opens in a new tab', async ({
    page,
  }) => {
    const donateLink = await getDonateLink(page);
    await expect(donateLink).toHaveAttribute(
      'href',
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );
    await expect(donateLink).toHaveAttribute('target', '_blank');
    await expect(donateLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(donateLink).toHaveAttribute(
      'aria-label',
      'Donate to WRDLNKDN',
    );
    await expect(
      page.getByRole('dialog', { name: 'Donate to WRDLNKDN' }),
    ).toHaveCount(0);

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      donateLink.click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );
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
