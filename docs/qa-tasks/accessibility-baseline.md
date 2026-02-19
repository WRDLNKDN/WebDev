Title: QA: Accessibility Baseline Compliance (MVP)

Type: Task

Parent Epic: IA: Add Directory as Canonical Surface and Restore IA Parity #191
Environment: UAT (webdev-uat.vercel.app)

Priority: P1 Size: M Points: 8 Estimated Time: 16 hours

---

## Goal

Validate that WRDLNKDN meets a functional MVP accessibility baseline, including:

- Reduced motion compliance
- Keyboard navigation support
- Focus visibility
- Basic color contrast
- Accessible form labeling

This is not full WCAG certification. This is MVP safety and usability
compliance.

---

## Preconditions

1. Tester has:
   - Fully onboarded account
   - Signed-out session
2. DevTools available.
3. Ability to enable OS-level reduced motion setting.

---

## Use Case 13A: Reduced Motion Compliance

Steps:

1. Enable “Prefers Reduced Motion” at OS level.
2. Load:
   - `/`
   - `/join`
   - `/feed`

Expected Behavior:

- Hero animation does not autoplay.
- Motion-based transitions are reduced or skipped.
- No forced animation.
- No flicker loops.

---

## Use Case 13B: Keyboard Navigation – Signed Out

Steps:

1. Use only keyboard (Tab, Shift+Tab, Enter).
2. Navigate:
   - Home
   - Join
   - OAuth buttons

Expected Behavior:

- All interactive elements are reachable.
- Focus ring is visible.
- Focus order is logical.
- No keyboard trap.

---

## Use Case 13C: Keyboard Navigation – Authenticated

Steps:

1. Log in.
2. Navigate via keyboard:
   - Nav links
   - Feed interactions
   - Directory filters
   - Chat input
   - Profile edit controls

Expected Behavior:

- All controls reachable by Tab.
- No hidden focus states.
- No focus lost after modal close.
- No stuck focus on background layer.

---

## Use Case 13D: Form Labeling (Join Flow)

Steps:

1. Inspect Join form fields.
2. Use screen reader or DevTools accessibility panel.

Expected Behavior:

- Inputs have associated labels.
- Required fields are indicated programmatically.
- Error messages are tied to inputs.
- No placeholder-only labels.

---

## Use Case 13E: Color Contrast Baseline

Steps:

1. Inspect:
   - Nav links
   - Buttons
   - Disabled states
   - Error messages
   - Dimmed hero state
2. Use DevTools contrast checker.

Expected Behavior:

- Text contrast meets readable threshold.
- OAuth buttons are highest contrast.
- Dimmed background does not reduce text readability.

---

## Use Case 13F: Focus Management on Route Change

Steps:

1. Navigate between major surfaces:
   - Home → Join
   - Join → Feed
   - Feed → Directory
2. Observe focus behavior.

Expected Behavior:

- Focus resets to top-level heading or logical container.
- Screen reader does not remain stuck in prior route.
- No invisible focus.

---

## Evidence to Capture

- Screenshot of focus rings
- Screenshot of reduced motion behavior
- Contrast ratios from DevTools
- Screen recording of keyboard-only navigation

---

## Severity

High:

- Keyboard trap
- Missing focus indication
- Reduced motion ignored
- Forms inaccessible to screen readers

Medium:

- Contrast slightly below ideal
- Focus not reset on route change

Low:

- Minor cosmetic inconsistencies

---

## Pass Criteria

- Core surfaces usable without a mouse.
- Reduced motion preference respected.
- Forms labeled correctly.
- Contrast readable.
- No accessibility-blocking defects.
