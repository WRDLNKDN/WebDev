<!-- markdownlint-disable MD013 MD060 -->

# Epic: Home (Pre-Signin Public Brand Surface)

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Public Surface / Marketing  
**Canonical Route:** `/`

The Home surface at `/` is the canonical public brand and intent surface for
WRDLNKDN. It is public, non-authenticated, brand-forward, and entry-oriented.

> Home ≠ Feed | Directory | Dashboard

Home is an intent surface, not a functionality surface.

---

## 1. Purpose

Provide a clear, focused public entry point that:

- Communicates what WRDLNKDN is
- Explains the value proposition
- Provides a single clear call-to-action
- Does not require authentication to render

Home must clearly route users into `/join` without duplicating authentication
logic.

---

## 2. Canonical Route & Access

- **Route:** `/`
- **Access:** Public — accessible to all users regardless of authentication
  state
- **IA alignment:** See [IA Baseline](./ia-baseline.md)

---

## 3. Core Capabilities (Implementation Status)

### 3.1 Brand Messaging ✅

- Mission / vision clarity
- Clear positioning
- No algorithm noise framing

### 3.2 Primary CTA ✅

- Single button: **"Join Us"** — routes to `/join`
- No OAuth provider buttons on Home

### 3.3 Hero Behavior ✅

- Animation plays once
- Fades to dim ambient state
- Copy fades in after animation
- Honors `prefers-reduced-motion`

### 3.4 Auth-Aware Rendering ✅

- Signed-out users remain on Home
- Authenticated users may be redirected per IA governance (if defined)
- No Feed flicker during hydration

### 3.5 Safe Refresh ✅

- Refreshing `/` does not trigger app error
- No protected content flashes
- No redirect loop

---

## 4. Explicit Non-Goals

Home must **not**:

- Contain OAuth provider buttons
- Start onboarding
- Render Feed content
- Render Directory content
- Render Profile content
- Duplicate `/join`
- Decide post-auth landing policy (belongs to IA governance)

---

## 5. Dependencies

- [Epic: Join (Authentication & Onboarding Surface)](./epic-join.md)
- [IA Baseline](./ia-baseline.md)
- Auth hydration logic
- Animation implementation

---

## 6. Acceptance Criteria

- [x] `/` renders without authentication required
- [x] Home contains a single CTA routing to `/join`
- [x] No OAuth provider selection appears on Home
- [x] Hero animation behaves consistently and respects reduced motion
- [x] No authenticated content flicker occurs
- [x] No redirect loops
- [x] Refreshing `/` is stable

---

## 7. Related Docs

- [Epic: Join](./epic-join.md)
- [IA Baseline](./ia-baseline.md)
- [Information Architecture](./information-architecture.md)
