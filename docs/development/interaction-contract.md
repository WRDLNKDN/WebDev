# Interaction Contract

Canonical UX behavior for dialogs, forms, toasts, and responsive surfaces.

## Dialogs

- `Escape` closes dialogs when there is no unsaved state to protect.
- If a dialog is dirty, `Escape` should route through the same unsaved-confirm
  logic as the close button.
- Dialogs should restore the user to a usable post-close state. Prefer returning
  focus to the opener when practical; at minimum, the opener must be visible and
  enabled immediately after close.
- Mobile dialogs should use `fullScreen` when content density or the on-screen
  keyboard makes fixed-size modals cramped.
- Use shared close helpers instead of hand-rolled `reason` checks.

## Form Submission

- Plain `Enter` submits simple single-purpose dialogs and forms.
- `Cmd/Ctrl+Enter` submits larger editing flows where plain `Enter` would be
  ambiguous or should preserve typing flow.
- `Shift+Enter` means newline in multiline inputs.
- Submit buttons should use actual form submit semantics where possible instead
  of click-only handlers.

## Toasts And Alerts

- Shared transient feedback goes through `AppToastContext`.
- Success and informational toasts should announce with polite live-region
  semantics.
- Warning and error toasts should announce assertively.
- `Escape` should dismiss the active toast.
- Persistent inline `Alert` blocks are for page-level or field-level problems
  that should remain visible until the user addresses or dismisses them.

## Responsive Expectations

- Primary actions must remain reachable on small widths and above mobile
  keyboards.
- Dense admin tables should use scroll-safe containers instead of assuming wide
  desktop layouts.
- Dialog footers and action rows should stack or wrap cleanly on mobile.
- Newer surfaces should match the visual quality bar already established in
  chat, directory, 404, and settings.

## Verification

- UI interaction changes should update unit tests or Playwright coverage when
  behavior changes.
- Run the accessibility route sweep for dialog, keyboard, toast, or layout work.
- Cross-browser Playwright coverage should continue to pass in Chromium,
  Firefox, and Edge.
