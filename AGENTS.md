# AGENTS.md

## Mode

This repo uses constraint-following mode.

- Do not redesign screens
- Do not reinterpret layouts
- Only make bounded edits

If structure changes instead of being refined, the solution is wrong.

## Mobile source of truth

- All screens are mobile-first
- Desktop is an adaptation, not a redesign
- Preserve layout structure unless explicitly told otherwise

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

## Action hierarchy

### Action hierarchy requirements

- One clear primary action
- Secondary actions visually de-emphasized

### Action hierarchy forbidden patterns

- Multiple equal-weight CTAs
- Conflicting navigation actions

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

## Visual rules

- Prefer fewer containers
- Prefer spacing over extra boxes
- Keep borders subtle
- Maintain strong vertical rhythm

## Implementation rules

- Make minimal changes
- Reuse existing components
- Briefly explain layout changes when making them

## Self-check

Before finishing, verify:

- Still phone-sized
- Not full-width
- Not a tiny widget
- Structure preserved
- No new navigation added
- Replay uses X as dismiss

If any answer is no, the solution is invalid.
