<!-- markdownlint-disable MD013 MD060 -->

# Sign-in Loop After Join Wizard — Analysis

[← Docs index](./README.md)

## Reported Issue

> Sign-in LOOPS to "Sign In" after completing Join wizard  
> Applies to: New User, Previous User

## Current Flow (Expected)

1. **Home** → "Join our Community" → `/join`
2. **Welcome** → **Identity (Sign in)** → OAuth → AuthCallback?next=/join →
   `/join` at Values step
3. **Values** → **Profile** → Submit → Bumper → `/feed`

## Potential Loop Sources

### 1. RequireOnboarded → /join vs Join → /feed mismatch

- **RequireOnboarded** (Feed guard): redirects to `/join` when no session OR
  when `!isProfileOnboarded(profile)`.  
  `isProfileOnboarded` only checks `display_name` (lenient).
- **Join** (on mount): redirects to `/feed` only when
  `hasPolicyVersion && hasValues && hasDisplayName` (stricter).

If a user has `display_name` but missing `policy_version` or
`join_reason`/`participation_style`, RequireOnboarded would allow Feed, but Join
would keep them on Join. That can cause odd flows, but not an obvious “loop to
Sign in.”

### 2. Profile not yet visible after insert

- Profile is inserted in ProfileStep.
- Navigate to Bumper → Feed.
- RequireOnboarded fetches profile; in rare cases (caching/replication) it might
  not see the new row.
- Result: redirect to `/join` → Join sees session + profile (eventually) →
  redirect to `/feed` → RequireOnboarded redirects again → flicker or loop.

### 3. Session lost

- If the session is lost (e.g. cookie cleared, tab closed and reopened),
  RequireOnboarded would redirect to `/join`.
- Join would show steps from saved localStorage state; if the last saved step
  was `identity`, the user sees “Sign in” again.

### 4. Identity step labeled “Sign in”

- Progress label for the Identity step is “Sign in”.
- Any redirect back to that step (or initial load with that step) would be
  perceived as “looping to Sign In,” even if it’s a one-off.

### 5. AuthCallback and Navbar OAuth use different `next`

- **IdentityStep (Join wizard):** `redirectTo=.../auth/callback?next=/join`
- **Navbar “Sign in”:** `redirectTo=.../auth/callback?next=/feed` (or similar)

If a user starts OAuth from the Navbar (e.g. after arriving on `/join` from
somewhere else), AuthCallback gets `next=/feed`. For a new user with no profile,
AuthCallback sends them to `/join`. That is correct. But any inconsistency in
where `next` is set could create confusing redirects.

## Recommendation

1. **Align onboarding criteria**  
   Use the same rules in RequireOnboarded, Join, and AuthCallback. Right now,
   Join uses stricter rules than `isProfileOnboarded`. Either tighten
   `isProfileOnboarded` or relax Join redirect logic so they match.

2. **Improve post-bumper navigation**  
   Ensure the Bumper → Feed transition is robust and that RequireOnboarded does
   not immediately redirect back to `/join` when the profile has just been
   created.

3. **Clear join state after success**  
   After a successful bumper → feed, clear any persisted join state or at least
   reset the “current step” so a later visit to `/join` does not show stale
   “Sign in” state.

4. **Debugging**  
   Add temporary console logs or debug flags to trace:
   - RequireOnboarded: session present? profile present? `isProfileOnboarded`
     result?
   - Join init: session present? profile present? `hasPolicyVersion`,
     `hasValues`, `hasDisplayName`?
   - AuthCallback: `next`, session, profile fetch, chosen redirect.

## Implemented Safeguard (Join page)

When a user has a session but the profile fetch returns `null` (e.g. new user,
timing, or RLS), the Join page now calls `reconcileWithExistingProfile` with a
minimal empty profile. This sets identity from the session and advances to the
Values step instead of showing the Identity ("Sign in") step again, preventing
the perceived "loop to Sign In" when redirected from RequireOnboarded.

## Files Involved

| File                                       | Role                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| `src/pages/auth/AuthCallback.tsx`          | OAuth return; decides `/join` vs `next`              |
| `src/pages/auth/Join.tsx`                  | On mount: redirect to Feed or reconcile              |
| `src/context/JoinProvider.tsx`             | `reconcileWithExistingProfile`, `submitRegistration` |
| `src/components/auth/RequireOnboarded.tsx` | Feed guard; redirects to `/join` when not onboarded  |
| `src/lib/profileOnboarding.ts`             | `isProfileOnboarded`                                 |
| `src/components/join/JoinProgress.tsx`     | Step label “Sign in” for Identity step               |
| `src/components/signup/ProfileStep.tsx`    | Submit → Bumper                                      |

<!-- markdownlint-enable MD013 MD060 -->
