import { expect, test } from '../fixtures';

test.describe('Home hero', () => {
  test('shows the updated pre-sign-in hero hierarchy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'WRDLNKDN', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    const pronunciation = page.getByText('(Weird Link-uh-din)');
    await expect(pronunciation).toBeVisible();
    await expect(pronunciation).toHaveCSS('font-style', 'italic');

    await expect(page.getByText('Business, but weirder.')).toBeVisible();
    await expect(
      page.getByText('A networking space for people who think differently'),
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
});
