# AGENTS.md

This file contains frontend-specific instructions for AI coding agents working
in this directory.

These instructions apply to UI, client, web, React, Next.js, Vite, component,
styling, accessibility, and frontend test changes.

## Frontend Operating Rules

The agent should:

- follow the existing component patterns before introducing new ones
- preserve responsiveness across desktop, tablet, and mobile
- avoid cramped layouts and inconsistent spacing
- prefer composable, reusable UI over one-off duplication
- keep diffs focused and easy to review
- update frontend docs and screenshots when behavior changes materially

## Before Editing

Inspect these first when present:

- `package.json`
- component folders
- shared UI primitives
- routing setup
- state management files
- API client or service layer
- frontend test setup
- styling config
- design system docs
- Storybook config if present

Do not invent a new pattern if the repo already has one.

## UI and Layout Rules

For any UI change:

- check spacing, alignment, hierarchy, and readability
- prefer fewer crowded controls on one row
- keep primary actions visually distinct
- avoid turning too many elements into button-like surfaces
- group related controls together
- preserve good empty states and loading states
- ensure layouts still work on smaller screens

When improving a screen, the agent should optimize for clarity first, then
visual polish.

## Component Rules

- prefer small, focused components
- reuse existing shared components when available
- avoid large monolithic components when logic can be separated
- keep props clear and minimal
- do not introduce unnecessary abstraction
- keep state close to where it is used unless shared state is justified

## Styling Rules

- follow the existing styling approach already used by the repo
- keep spacing and sizing consistent with surrounding UI
- do not mix multiple styling patterns without a strong reason
- avoid hard-coded magic numbers unless already standard in the repo
- preserve dark mode or theme support when it already exists
- avoid visual regressions in hover, focus, active, disabled, and loading states

## Accessibility Rules

For user-facing UI work, verify when practical:

- buttons have clear labels
- inputs have labels or accessible names
- keyboard interaction still works
- focus states remain visible
- color contrast is not obviously degraded
- icon-only controls have accessible text
- semantic HTML is used where reasonable

Do not trade accessibility away for minor visual convenience.

## Frontend Data Rules

- keep API calls in the existing service or data layer
- avoid putting fetch logic deep inside random UI components if the repo has a
  better pattern
- handle loading, success, empty, and error states
- do not silently swallow errors
- preserve existing cache and invalidation patterns where used

## Frontend Testing Rules

The agent should run and update the relevant frontend validations automatically.

Preferred validation order:

```bash
npm run lint
npm run typecheck || npm run check || true
npm run test
npm run test:unit || true
npm run test:component || true
npm run test:e2e -- --workers=12 || npm run e2e -- --workers=12 || true
```

If Playwright is used, prefer:

```bash
npx playwright test --workers=12
```

If Cypress is used, run the repo's existing command and use the highest
supported safe concurrency.

Rules:

- add or update tests for UI behavior changes when practical
- add regression tests for fixed bugs when practical
- update snapshots intentionally, not casually
- do not skip tests to force green status

## Performance Rules

When touching frontend performance-sensitive code:

- avoid unnecessary re-renders
- avoid repeated expensive calculations in render paths
- memoize only when it actually helps and matches repo style
- lazy load large areas only when useful and already aligned with the app
  pattern
- preserve perceived performance for common flows

## Documentation Rules

Update frontend-facing docs when changing:

- setup steps
- scripts
- component usage
- user flows
- environment variables
- screenshot-worthy UI changes
- testing instructions

Check these locations:

- `README.md`
- `docs/`
- frontend-specific markdown files
- Storybook docs if present

Also run markdown lint if configured.

## Safety Rules

Never:

- expose secrets in client code
- hard-code environment secrets
- weaken auth or permission checks in the UI in misleading ways
- remove validation just to make the UI appear functional
- break mobile layouts without calling it out

## Final Response

When work is done, report:

1. what frontend files changed
2. what UI behavior changed
3. what validation ran
4. any remaining visual or edge-case risks
