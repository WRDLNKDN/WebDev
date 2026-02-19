# Deterministic Profile Provisioning

**Epic:** API & Data Layer Governance  
**Date:** 2026-02-14

---

## Flow Summary

1. **OAuth** → Supabase Auth creates `auth.users` row. No profile yet.
2. **AuthCallback** → Fetches profile. If missing or !isProfileOnboarded →
   redirect to /join.
3. **Join flow** → ValuesStep → ProfileStep → submitRegistration → INSERT or
   UPDATE profile.
4. **useProfile fallback** → If dashboard/settings accessed with no profile
   (edge case), upsert minimal row. User will be redirected to /join by
   RequireOnboarded (profile fails isProfileOnboarded).

---

## No Duplicate Rows

- **SignupProvider**: Uses INSERT. On 23505 (duplicate id), treats as success
  (idempotent).
- **useProfile**: Uses upsert with `onConflict: 'id', ignoreDuplicates: true`.
  On conflict, refetches.

---

## Re-entry / Partial State

- **reconcileWithExistingProfile**: When user returns to /join with existing
  partial profile, populates form and advances to correct step.
- **submitRegistration**: If existing row, UPDATE with signup data. No orphan
  rows.

---

## Mandatory Defaults

- `status`: default 'approved' (post- moderation removal).
- `handle`: derived from display_name or email; retries with suffix on conflict.
- `display_name`, `join_reason`, `participation_style`: required for onboarding
  completion.
