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
  test('removes platform links and keeps donate centered under docs with socials right-aligned', async ({
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
    await expect(donate).toHaveAttribute(
      'href',
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );
    await expect(donate).toHaveAttribute('target', '_blank');
    await expect(donate).toHaveAttribute('rel', 'noopener noreferrer');

    const donateBox = await donate.boundingBox();
    expect(donateBox).not.toBeNull();
    if (!donateBox) {
      throw new Error('Footer donate placement could not be measured.');
    }

    const socials = footer.getByTestId('footer-social-links');
    const copyright = footer.getByTestId('footer-copyright');
    await expect(socials).toBeVisible();
    await expect(copyright).toBeVisible();
    const instagram = footer.getByLabel('Instagram');
    const github = footer.getByLabel('GitHub');
    await expect(instagram).toBeVisible();
    await expect(github).toBeVisible();
    await expect(instagram).toHaveAttribute(
      'href',
      'https://www.instagram.com/wrdlnkdn/',
    );
    await expect(github).toHaveAttribute('href', 'https://github.com/wrdlnkdn');
    await expect(instagram).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(github).toHaveAttribute('rel', 'noopener noreferrer');
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

    // Donate now lives in the center section; socials remain in right section.
    expect(donateBox.x + donateBox.width).toBeLessThan(socialsBox.x);
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
