import { expect, test } from '../fixtures';

test.describe('Home bumper transition', () => {
  test('crossfades from the bumper into the revealed shell instead of hard-cutting', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('signed-out-landing')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.home-landing')).toBeVisible();
    await expect(page.locator('.home-landing__hero-backdrop')).toBeVisible();
    await expect(page.locator('.home-landing__video-overlay')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const landing = document.querySelector('.home-landing');
          const heroCopy = document.querySelector('.home-landing__content');
          const backdrop = document.querySelector(
            '.home-landing__hero-backdrop',
          );
          const overlay = document.querySelector(
            '.home-landing__video-overlay',
          );
          return Boolean(landing && heroCopy && backdrop && overlay);
        }),
      )
      .toBe(true);

    const transitionState = await page.evaluate(() => {
      const landing = document.querySelector('.home-landing');
      const heroCopy = document.querySelector('.home-landing__content');
      const video = document.querySelector(
        '.home-landing__video',
      ) as HTMLVideoElement | null;
      const backdrop = document.querySelector('.home-landing__hero-backdrop');
      const overlay = document.querySelector('.home-landing__video-overlay');
      if (!landing || !heroCopy || !backdrop || !overlay) {
        return null;
      }

      const landingEl = landing as HTMLElement;

      const before = {
        hadVideo: Boolean(video),
        backdropBg: globalThis.getComputedStyle(backdrop).backgroundColor,
        backdropTransition: globalThis.getComputedStyle(backdrop).transition,
        homeHeroMode: landingEl.dataset.homeHeroMode ?? null,
      };

      video?.dispatchEvent(new Event('ended'));

      return new Promise<{
        before: typeof before;
        after: {
          heroCopyVisible: boolean;
          videoRemoved: boolean;
          overlayBg: string;
          backdropBg: string;
          homeHeroMode: string | null;
          landingHasHeroCompactClass: boolean;
          heroSectionHasCompactClass: boolean;
        };
      }>((resolve) => {
        globalThis.setTimeout(() => {
          const heroEl = document.querySelector('.home-landing__hero');
          resolve({
            before,
            after: {
              heroCopyVisible: heroCopy.classList.contains(
                'home-landing__content--visible',
              ),
              videoRemoved:
                document.querySelector('.home-landing__video') === null,
              overlayBg: globalThis.getComputedStyle(overlay).backgroundColor,
              backdropBg: globalThis.getComputedStyle(backdrop).backgroundColor,
              homeHeroMode: landingEl.dataset.homeHeroMode ?? null,
              landingHasHeroCompactClass: landing.classList.contains(
                'home-landing--hero-compact',
              ),
              heroSectionHasCompactClass: Boolean(
                heroEl?.classList.contains('home-landing__hero--compact'),
              ),
            },
          });
        }, 1700);
      });
    });

    expect(transitionState).not.toBeNull();
    expect(transitionState?.before.backdropBg).toBe('rgb(0, 0, 0)');
    expect(transitionState?.before.backdropTransition).toContain(
      'background-color',
    );
    expect(transitionState?.after.heroCopyVisible).toBe(true);
    expect(transitionState?.after.homeHeroMode).toBe('compact');
    expect(transitionState?.after.landingHasHeroCompactClass).toBe(true);
    expect(transitionState?.after.heroSectionHasCompactClass).toBe(true);
    const overlayBg = transitionState?.after.overlayBg ?? '';
    const overlayMatch = overlayBg.match(
      /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/,
    );
    expect(overlayMatch).not.toBeNull();
    expect(Number(overlayMatch![1])).toBeLessThan(0.05);
    if (transitionState?.before.hadVideo) {
      expect(transitionState.before.homeHeroMode).toBe('video');
      expect(transitionState.after.videoRemoved).toBe(true);
    }
    const backdropAlpha = transitionState?.after.backdropBg?.match(
      /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/,
    );
    expect(backdropAlpha).not.toBeNull();
    expect(Number(backdropAlpha![1]) < 0.05).toBe(true);
  });
});
