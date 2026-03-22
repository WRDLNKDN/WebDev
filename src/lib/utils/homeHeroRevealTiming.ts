/**
 * Hero handoff after video ends (or skip): video unmount waits for CSS opacity fade.
 * **Keep in sync** with transition durations in `src/components/home/homeLanding.css`
 * (search for `--hero-reveal-`).
 */
export const HOME_HERO_VIDEO_FADE_MS = 1250;
/** Footer chrome after video node unmounts (allows layout to settle). */
export const HOME_HERO_FOOTER_DELAY_AFTER_UNMOUNT_MS = 650;
