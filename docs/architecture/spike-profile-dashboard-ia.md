<!-- markdownlint-disable MD013 MD060 -->

# Spike: Profile vs Dashboard IA — Canonical Model

**Date:** 2026-02-14  
**Goal:** Confirm intended vs implemented relationship between
`/profile/:handle` and `/dashboard/*`, and declare a canonical model for
routing, navigation, and future work.

---

## 1. Current Implementation

### 1.1 Routes (from `App.tsx`)

| Route              | Page                                    | Access           |
| ------------------ | --------------------------------------- | ---------------- |
| `/`                | Home                                    | Public           |
| `/profile/:handle` | LandingPage                             | Public           |
| `/u/:handle`       | RedirectUToProfile → `/profile/:handle` | Public           |
| `/dashboard`       | Dashboard                               | RequireOnboarded |
| `/feed`            | Feed                                    | RequireOnboarded |
| `/join`            | Join                                    | Public           |

**Note:** There is **no** `/dashboard/*` sub-routes. Only `/dashboard` exists.

### 1.2 Page Behavior

**LandingPage (`/profile/:handle`)**

- Public read-only identity surface
- Fetches profile by handle; shows Connect/Unfollow for non-owners
- When `viewer.id === profile.id` (owner viewing own profile): **no special
  treatment** — same layout, no Connect button, **no edit affordances**
- Does NOT redirect owner to Dashboard

**Dashboard (`/dashboard`)**

- Distinct private page (RequireOnboarded)
- Full owner control surface: Edit Profile, Settings, Edit Links, Add Project,
  Add Resume, Add weirdling
- All edits via **dialogs** (EditProfileDialog, SettingsDialog, EditLinksDialog,
  etc.) — not separate routes

**Home (`/`)**

- If authenticated → redirects to `/feed` (not `/dashboard` or
  `/profile/:handle`)
- Canonical authenticated landing = **/feed**

### 1.3 Navigation

- **Nav labels when logged in:** Feed, Dashboard (separate items)
- **Highlighting:**
  - On `/feed` → Feed active
  - On `/dashboard` (or `/dashboard/*`) → Dashboard active
  - On `/profile/:handle` → **neither** Feed nor Dashboard active (no Profile
    nav label)

### 1.4 Dashboard Sub-Routes (IA vs Implementation)

| IA Doc                     | Implemented                             |
| -------------------------- | --------------------------------------- |
| `/dashboard/profile`       | ❌ Edit is a dialog on `/dashboard`     |
| `/dashboard/activity`      | ❌ Not implemented                      |
| `/dashboard/intent`        | ❌ Not implemented                      |
| `/dashboard/notifications` | ❌ Not implemented                      |
| `/dashboard/settings`      | ❌ Settings is a dialog on `/dashboard` |

### 1.5 Orphaned / Inconsistent

- **ProjectCard** links to `/projects/:id` but **no `/projects/:id` route
  exists** → 404
- **ProjectPage** exists in `src/pages/profile/ProjectPage.tsx` but is **not
  wired** in `App.tsx`

---

## 2. IA Doc vs Implementation

| Aspect                | IA Doc                                            | Implementation                   |
| --------------------- | ------------------------------------------------- | -------------------------------- |
| Profile               | Public identity surface                           | ✅ Matches                       |
| Dashboard             | Private control surface                           | ✅ Matches                       |
| Owner edit location   | Implied: `/dashboard/profile`                     | Edit via dialogs on `/dashboard` |
| Dashboard sub-routes  | `/dashboard/profile`, `/dashboard/activity`, etc. | ❌ Only `/dashboard`             |
| Authenticated landing | Not specified                                     | `/feed` (from Home.tsx)          |
| Nav                   | Feed + Dashboard                                  | ✅ Matches                       |

---

## 3. Decision Statement: Option B (with Clarifications)

**Chosen Model: Option B — Profile is public read-only; Dashboard is the private
control surface.**

### Rationale

- **Clear separation of concerns:** Profile = what others see; Dashboard = where
  you manage it. No ambiguity about where to edit.
- **Implementation already aligns:** Dashboard owns editing via dialogs; profile
  is read-only. No need to add owner-edit mode to profile.
- **Epic Home Dashboard** says profile is "editable by the owner and viewable by
  others" but does not require owner-edit on the same route — it can mean "the
  owner edits from Dashboard."
- **Future-proof:** When we add `/dashboard/settings`, `/dashboard/activity`,
  etc., they stay under one control surface. Profile remains stable for SEO and
  sharing.

### Clarifications

1. **Authenticated landing route:** `/feed` (current behavior). This is
   acceptable; Feed is the primary consumption surface. Landing on Feed vs
   Dashboard is a product choice; either is valid. No change unless product
   explicitly wants profile-first landing.
2. **Owner edit route:** `/dashboard` (edit via dialogs). Optional future:
   `/dashboard/profile` as a dedicated edit route if we outgrow dialogs.
3. **Owner on own profile:** No redirect to Dashboard. Owner sees read-only
   profile; if they want to edit, they use nav → Dashboard.
4. **Dashboard sub-routes:** IA doc lists them as planned. Implement as needed;
   keep `/dashboard` as the base and add `/dashboard/settings`,
   `/dashboard/activity`, etc. when we build those features.

---

## 4. IA Update

Applied to `information-architecture.md`: new section **Authenticated User
Routing** with the table above. See that file for the canonical routing rules.

---

## 5. Follow-On Work Items

| #   | Work Item                                                                                                      | Status                      |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Add `/projects/:id` route and wire `ProjectPage` (ProjectCard links here, previously 404)                      | ✅ Done                     |
| 2   | Decide: Should authenticated landing be `/feed` or `/profile/:handle` or `/dashboard`? Document and implement. | Kept as `/feed` (no change) |
| 3   | Add "Edit profile" link on `/profile/:handle` for owner → navigates to `/dashboard` and opens Edit dialog      | ✅ Done                     |
| 4   | When building settings/activity/notifications: implement `/dashboard/*` sub-routes per IA                      | Future                      |
