/**
 * Signed-out Home hero surface: full-bleed intro video vs compact conversion block.
 * Syncs with `homeHeroPhaseStore` (`video` → Layout matte, `reveal` → grid shell).
 *
 * **QA:** On `<main data-testid="signed-out-landing">`, `data-home-hero-mode` is
 * `video` during intro and `compact` after end/skip/error/reduced-motion. E2E:
 * `src/tests/e2e/home/home-bumper-transition.spec.ts`.
 */
export type HomeHeroUiMode = 'video' | 'compact';
