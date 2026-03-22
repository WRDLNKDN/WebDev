import { expect, test } from '../fixtures';

test.describe('Home bumper transition', () => {
  test('crossfades from the bumper into the revealed shell instead of hard-cutting', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 30_000,
    });

    const transitionState = await page.evaluate(() => {
      const landing = document.querySelector('.home-landing');
      const scrollContainer = document.querySelector('.app-scroll-container');
      const appMain = document.querySelector('[data-testid="app-main"]');
      const video = document.querySelector(
        '.home-landing__video',
      ) as HTMLVideoElement | null;
      const backdrop = document.querySelector('.home-landing__hero-backdrop');
      const overlay = document.querySelector('.home-landing__video-overlay');
      if (
        !landing ||
        !scrollContainer ||
        !appMain ||
        !video ||
        !backdrop ||
        !overlay
      ) {
        return null;
      }

      const before = {
        scrollBg: window.getComputedStyle(scrollContainer).backgroundColor,
        scrollTransition: window.getComputedStyle(scrollContainer).transition,
        backdropTransition: window.getComputedStyle(backdrop).transition,
      };

      video.dispatchEvent(new Event('ended'));

      return new Promise<{
        before: typeof before;
        after: {
          showContent: boolean;
          videoRemoved: boolean;
          overlayBg: string;
          scrollBg: string;
        };
      }>((resolve) => {
        window.setTimeout(() => {
          resolve({
            before,
            after: {
              showContent: appMain.classList.contains(
                'home-landing__content--visible',
              ),
              videoRemoved:
                document.querySelector('.home-landing__video') === null,
              overlayBg: window.getComputedStyle(overlay).backgroundColor,
              scrollBg:
                window.getComputedStyle(scrollContainer).backgroundColor,
            },
          });
        }, 1700);
      });
    });

    expect(transitionState).not.toBeNull();
    expect(transitionState?.before.scrollBg).toBe('rgb(0, 0, 0)');
    expect(transitionState?.before.scrollTransition).toContain(
      'background-color',
    );
    expect(transitionState?.before.backdropTransition).toContain(
      'background-color',
    );
    expect(transitionState?.after.showContent).toBe(true);
    expect(transitionState?.after.videoRemoved).toBe(true);
    expect(transitionState?.after.overlayBg).toBe('rgba(0, 0, 0, 0)');
    expect(transitionState?.after.scrollBg).toBe('rgba(0, 0, 0, 0)');
  });
});
