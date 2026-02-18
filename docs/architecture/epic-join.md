<!-- markdownlint-disable MD013 MD060 -->

# Epic: Join (Authentication & Onboarding Surface) #85

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Join / Authentication / Onboarding  
**Canonical Route:** `/join`

The Join surface is the canonical authentication and onboarding entry point. It
is the single place where users choose an OAuth provider, authenticate, complete
required onboarding fields, resolve partial profiles, and hand off to the
post-auth surface defined by IA governance.

> Join ≠ Dashboard | Profile | Feed

Join is the entry flow.

---

## 1. Purpose

Ensure every authenticated account results in a valid, consistent application
state by:

- Handling OAuth entry
- Creating the profile record when needed
- Reconciling partial profile states
- Routing users to the correct next step without loops or flicker

---

## 2. Canonical Route & Access

- **Route:** `/join`
- **Access:** Public, with authenticated continuation
- **Behavior:**
  - Signed-out users can access `/join`
  - Signed-in users with incomplete profiles are routed into onboarding
  - Signed-in users with complete profiles are redirected to the authenticated
    surface
- **Legacy redirect:** `/signup` → `/join` (replace)

---

## 3. Core Capabilities (Implementation Status)

### 3.1 OAuth Provider Entry ✅

- Provider selection occurs on `/join` only
- Supports Google and Microsoft
- Clear user feedback during redirect and callback

### 3.2 Onboarding Wizard ✅

- Required fields enforced
- Progress persistence
- No ambiguous step resolution
- Steps: Welcome → Identity (OAuth) → Values → Profile → Complete

### 3.3 Profile Provisioning ✅

- Create profile record after first successful auth if none exists
- Ensure required defaults and metadata exist

### 3.4 Partial State Reconciliation ✅

- Detect profiles that exist but are incomplete
- Perform gap analysis on required fields
- Route user to first missing step
- Prevent state-lock and redirect loops

### 3.5 Routing and Guard Integrity ✅

- No redirect back to sign-in after successful auth
- No Feed flicker for first-time users
- Deterministic post-auth routing behavior

### 3.6 Accessibility and Motion Preferences ✅

- Respect `prefers-reduced-motion` where applicable
- Clear focus states and keyboard navigation for the Join flow

---

## 4. Explicit Non-Goals

Join must **not**:

- Contain Feed content
- Act as Directory
- Act as Dashboard
- Duplicate OAuth selection on Home
- Require manual admin intervention for a normal onboarding path

Admin moderation belongs under the moderation Epic, not Join.

---

## 5. Governance

- Use `/join` as the route anchor
- Respect separation between Join, Profile, Dashboard, Feed, and Directory
- Avoid duplicate OAuth entry points across surfaces
- Maintain deterministic state resolution for partial profiles
- **No legacy naming:** "Signup" is replaced with "Join" in UI and docs

---

## 6. Dependencies

- Auth provider configuration in Supabase (UAT and PROD)
- Profile schema and required field definitions
- Route guards and auth hydration behavior
- [IA Baseline](./ia-baseline.md)
- [API layer patterns](./api-layer.md) (if applicable)

---

## 7. Acceptance Criteria

- [x] `/join` is the single OAuth provider entry point
- [x] Users authenticate once and are not asked to select OAuth providers again
      after callback
- [x] First-time users complete onboarding without Feed flicker or redirect
      loops
- [x] Returning users with partial profiles are routed to the correct next step
- [x] Users with completed profiles are redirected away from `/join` to the
      correct authenticated surface
- [x] Join flow works across desktop and mobile
- [x] No legacy naming in UI or docs: "Signup" replaced with "Join"

---

## 8. Related Docs

- [Epic: Home](./epic-home.md)
- [IA Baseline](./ia-baseline.md)
- [Information Architecture](./information-architecture.md)
- [API Layer](./api-layer.md)
