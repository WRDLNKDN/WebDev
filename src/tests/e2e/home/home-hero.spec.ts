import { expect, test } from '../fixtures';
test.describe('Home hero', () => {
  test('shows the updated pre-sign-in hero hierarchy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const landing = page.getByTestId('signed-out-landing');

    await expect(
      page.getByRole('heading', { name: 'WRDLNKDN', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    const pronunciation = landing.getByText('(Weird Link-uh-din)');
    await expect(pronunciation).toBeVisible();
    await expect(pronunciation).toHaveCSS('font-style', 'italic');

    await expect(landing.getByText('Business, but weirder.')).toBeVisible();
    await expect(
      landing.getByText('A networking space for people who think differently'),
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Join Us' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Already a member? Sign In' }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "A professional networking space where you don't have to pretend.",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText('For people who build, create, and think differently.'),
    ).toHaveCount(0);
  });

  test('uses the optimized hero media path without falling back to the legacy video', async ({
    page,
  }) => {
    const heroAssetRequests = new Set<string>();
    page.on('requestfinished', (request) => {
      const url = request.url();
      if (url.includes('/assets/video/hero-bg')) {
        heroAssetRequests.add(url);
      }
    });
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('/assets/video/hero-bg')) {
        heroAssetRequests.add(url);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible();

    const heroVideo = page.locator('video').first();
    await expect
      .poll(() => Array.from(heroAssetRequests))
      .toContainEqual(
        expect.stringMatching(/hero-bg-(desktop|mobile)\.mp4($|\?)/),
      );
    await expect
      .poll(() => Array.from(heroAssetRequests))
      .not.toContainEqual(expect.stringMatching(/hero-bg\.mp4($|\?)/));

    if ((await heroVideo.count()) > 0) {
      await expect
        .poll(async () => {
          return heroVideo.evaluate((node) => ({
            currentSrc: (node as HTMLVideoElement).currentSrc,
            readyState: (node as HTMLVideoElement).readyState,
            paused: (node as HTMLVideoElement).paused,
          }));
        })
        .toMatchObject({
          currentSrc: expect.stringMatching(/hero-bg-(desktop|mobile)\.mp4$/),
          readyState: expect.any(Number),
          paused: false,
        });
    } else {
      await expect(page.locator('video')).toHaveCount(0);
    }
  });

  test('root uses the current shared shell with header and footer chrome', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: 'Go to home' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('signed-out-landing')).toBeVisible();

    /* Footer stays hidden until Home sets data-footer-visible after intro handoff */
    const heroVideo = page.locator('video.home-landing__video').first();
    if ((await heroVideo.count()) > 0) {
      await heroVideo.evaluate((el) => {
        el.dispatchEvent(new Event('ended'));
      });
    }
    await expect(page.locator('html')).toHaveAttribute(
      'data-footer-visible',
      'true',
      { timeout: 25_000 },
    );

    const footer = page.getByTestId('site-footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });
});
