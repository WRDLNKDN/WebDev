# AGENTS.md

## Mode

This repo uses constraint-following mode.

- Do not redesign screens
- Do not reinterpret layouts
- Only make bounded edits

If structure changes instead of being refined, the solution is wrong.

---

## Mobile source of truth

- All screens are mobile-first
- Desktop is an adaptation, not a redesign
- Preserve layout structure unless explicitly told otherwise

---

## Mobile layout

### Mobile layout requirements

- Render screens as a phone-sized UI
- Keep primary screen width between 390px and 460px
- Center the mobile shell on desktop previews
- Keep the UI readable and properly scaled
- Use an outer centered wrapper and an inner `w-full max-w-md` container

### Mobile layout forbidden patterns

- Full-width layout for mobile screens
- Tiny floating card in a large empty canvas
- Desktop reinterpretation of a mobile screen
- Nested centering that shrinks the UI
- `max-w-sm` for the main app shell

If it looks like a tiny card floating in space, it is wrong.

---

## Action hierarchy

### Action hierarchy requirements

- One clear primary action
- Secondary actions visually de-emphasized

### Action hierarchy forbidden patterns

- Multiple equal-weight CTAs
- Conflicting navigation actions

---

## Replay screen

Replay is a modal overlay.

### Replay screen requirements

- Top-right X close button
- X is the primary dismiss action
- Header with title, stats, and X
- Replay stage as the main focus
- Control dock visually attached to the replay stage

### Replay screen forbidden patterns

- Multiple exit actions
- `Back to Results` if X already exists
- Floating detached controls
- Tiny replay widget in a huge empty area

---

## Visual rules

- Prefer fewer containers
- Prefer spacing over extra boxes
- Keep borders subtle
- Maintain strong vertical rhythm

---

## Implementation rules

- Make minimal changes
- Reuse existing components
- Briefly explain layout changes when making them

---

## Code quality (SonarQube)

### Requirements

- Do not duplicate logic across components or files
- Extract shared logic into reusable functions, hooks, or utilities
- Prefer composition over copy-paste
- Reuse existing components before creating new ones
- Keep functions small and single-purpose
- Follow existing patterns in the repo when extending behavior

### Forbidden patterns

- Copy-pasting logic between components
- Slightly modifying duplicated blocks instead of abstracting them
- Creating multiple versions of the same helper logic
- Duplicating validation, API calls, or transformation logic
- Re-implementing existing utilities instead of reusing them

### Expectations

- If you write similar logic twice, refactor
- If a pattern exists in the repo, reuse it
- Keep abstractions clean and readable

---

## Cross-platform UX consistency

### Requirements

- Mobile is the source of truth
- Desktop must feel like a natural scale-up, not a redesign
- Preserve interaction patterns across breakpoints
- Maintain consistent spacing, typography, and hierarchy

### Forbidden patterns

- Desktop-only UI patterns that don’t exist on mobile
- Reordering layouts drastically between breakpoints
- Introducing new navigation patterns only on desktop

---

## Accessibility (A11y)

### Requirements

- Ensure sufficient color contrast (WCAG AA minimum)
- Support color blindness (do not rely on color alone)
- Provide text labels for icons and actions
- Ensure all interactive elements are reachable via keyboard
- Maintain visible focus states
- Use semantic HTML where possible

### Keyboard support

- All actions must be accessible via keyboard
- Tab order must be logical
- Enter/Space triggers primary actions
- Escape closes modals (including Replay)

### Screen reader support

- Use aria-labels where needed
- Ensure buttons and inputs have clear accessible names
- Avoid ambiguous elements

### Forbidden patterns

- Color-only state indicators (e.g. red vs green without labels/icons)
- Hidden focus states
- Click-only interactions with no keyboard equivalent

---

## Self-check

Before finishing, verify:

- Still phone-sized
- Not full-width
- Not a tiny widget
- Structure preserved
- No new navigation added
- Replay uses X as dismiss
- No duplicated logic introduced
- Works across mobile and desktop consistently
- Accessible via keyboard
- Usable for color-blind users

If any answer is no, the solution is invalid.
