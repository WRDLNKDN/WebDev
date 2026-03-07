import { expect, test, type Page } from './fixtures';
import { stubAppSurface } from './utils/stubAppSurface';

async function goToFooter(page: Page) {
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  const footer = page.getByTestId('site-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  return footer;
}

test.describe('Footer layout', () => {
  test('removes platform links and keeps donate centered under documentation', async ({
    page,
  }) => {
    await stubAppSurface(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    const footer = await goToFooter(page);

    await expect(footer.getByTestId('footer-section-company')).toBeVisible();
    await expect(
      footer.getByTestId('footer-section-documentation'),
    ).toBeVisible();
    await expect(footer.getByRole('button', { name: /platform/i })).toHaveCount(
      0,
    );
    await expect(footer.getByText(/^feed$/i)).toHaveCount(0);
    await expect(footer.getByText(/^chat$/i)).toHaveCount(0);
    await expect(footer.getByText(/^notifications$/i)).toHaveCount(0);
    await expect(footer.getByText(/^directory$/i)).toHaveCount(0);

    const donate = footer.getByTestId('footer-donate-link');
    await expect(donate).toHaveAttribute('aria-label', 'Donate to WRDLNKDN');
    await expect(donate).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(donate).toHaveAttribute(
      'aria-controls',
      'footer-donate-modal',
    );

    const documentation = footer.getByTestId('footer-section-documentation');
    const docBox = await documentation.boundingBox();
    const donateBox = await donate.boundingBox();
    expect(docBox).not.toBeNull();
    expect(donateBox).not.toBeNull();
    if (!docBox || !donateBox) {
      throw new Error('Footer donate placement could not be measured.');
    }

    const docCenterX = docBox.x + docBox.width / 2;
    const donateCenterX = donateBox.x + donateBox.width / 2;

    expect(donateBox.y).toBeGreaterThan(docBox.y + docBox.height - 2);
    expect(Math.abs(docCenterX - donateCenterX)).toBeLessThan(90);

    const socials = footer.getByTestId('footer-social-links');
    const copyright = footer.getByTestId('footer-copyright');
    await expect(socials).toBeVisible();
    await expect(copyright).toBeVisible();
    await expect(footer.getByLabel('Instagram')).toBeVisible();
    await expect(footer.getByLabel('GitHub')).toBeVisible();
    await expect(
      footer.getByText(/build signal-first connections/i),
    ).toHaveCount(0);

    const socialsBox = await socials.boundingBox();
    const copyrightBox = await copyright.boundingBox();
    expect(socialsBox).not.toBeNull();
    expect(copyrightBox).not.toBeNull();
    if (!socialsBox || !copyrightBox) {
      throw new Error('Footer social layout could not be measured.');
    }

    expect(copyrightBox.y).toBeGreaterThan(
      socialsBox.y + socialsBox.height - 2,
    );
  });

  test('stays compact and avoids horizontal overflow on mobile', async ({
    page,
  }) => {
    await stubAppSurface(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const footer = await goToFooter(page);
    const donate = footer.getByTestId('footer-donate-link');
    await expect(donate).toBeVisible();

    const footerMetrics = await footer.evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      clientHeight: node.clientHeight,
    }));

    expect(footerMetrics.scrollWidth).toBeLessThanOrEqual(
      footerMetrics.clientWidth + 1,
    );
    expect(footerMetrics.clientHeight).toBeLessThan(320);
  });
});
