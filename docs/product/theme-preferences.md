# Theme Preferences

Canonical reference for app-level appearance themes in WRDLNKDN.

## Overview

Signed-in users can choose a global site theme from **Dashboard → Settings →
Appearance** at `/dashboard/settings/appearance`.

Available themes:

- `Light`
- `Ocean`
- `Forest`
- `Space`

Themes apply across desktop and mobile.

## Behavior

- Theme choice updates the full application shell, not just the settings page.
- The active theme persists to the signed-in user's
  `profiles.nerd_creds.app_theme` value.
- Local storage keeps the preference sticky during startup and for fallback
  cases before profile hydration completes.
- Theme changes use the shared toast system for confirmation feedback.

## UX Expectations

- Theme cards must remain keyboard accessible and expose active state with
  `aria-pressed`.
- Visual contrast and focus states must continue to meet the project's
  accessibility bar.
- Themes must not rely on color alone for selected or important states. Pair
  color with text, icons, borders, underline, or other shape/state cues.
- Shared motion should respect `prefers-reduced-motion`, especially for hover
  lift, chip movement, and page-level transitions.
- New themes should define a complete palette and supporting gradient/focus
  tokens rather than patching isolated colors.

## Implementation

- Theme registry: `src/theme/themeConstants.ts`
- Theme factory: `src/theme/theme.ts`
- Global provider and persistence: `src/context/AppThemeContext.tsx`
- Settings surface: `src/pages/dashboard/SettingsAppearancePage.tsx`

## Verification

- Playwright coverage lives in
  `src/tests/e2e/settings/settings-appearance.spec.ts`
- Accessibility route coverage includes the appearance settings page in
  `src/tests/e2e/layout/accessibility.spec.ts`
- Theme contrast guardrails live in `src/tests/theme/themeAccessibility.test.ts`
