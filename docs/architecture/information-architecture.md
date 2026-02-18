<!-- markdownlint-disable MD013 MD060 -->

# Information Architecture (IA)

[← Docs index](../README.md)

**Single source of truth** for WRDLNKDN MVP page names, routes, access rules,
and navigation. Use this doc for design, engineering, and onboarding.

---

## Canonical IA (ASCII Directory)

```text
/
├── home                    Public
│   └── route: /
│
├── join                    Public
│   └── route: /join
│
├── feed                    Authenticated
│   └── route: /feed
│
├── profile                 Public (or Authenticated only, if required)
│   ├── route: /profile/:handle
│   └── examples:
│       ├── /profile/april
│       └── /profile/greenling42
│
└── dashboard               Authenticated
    ├── route: /dashboard
    ├── sections:
    │   ├── /dashboard/profile      Edit my profile
    │   ├── /dashboard/activity     My posts and engagement
    │   ├── /dashboard/intent       My intent and participation settings
    │   ├── /dashboard/notifications Mentions, DMs, invites
    │   └── /dashboard/settings     Account and privacy
    └── note:
        Dashboard is the user's private control surface.
        Profile is the user's public identity surface.
```

---

## Public vs Authenticated Access

| Page      | Access        | Route(s)             |
| --------- | ------------- | -------------------- |
| Home      | Public        | `/`                  |
| Join      | Public        | `/join`              |
| Feed      | Authenticated | `/feed`              |
| Profile   | Public\*      | `/profile/:handle`   |
| Dashboard | Authenticated | `/dashboard` and sub |

\*Profile may be restricted to authenticated-only if product requires it.

---

## Navigation Model

### Primary navigation labels

- **Home** — always (links to `/`)
- **Feed** — when logged in (links to `/feed`)
- **Join** — when logged out (links to `/join`)
- **Dashboard** — when logged in (links to `/dashboard`)
- **Store** — if present (out of scope for this IA unless already live)

When logged out, show **Join**; when logged in, show **Dashboard** in the same
slot. Do not use "Directory" or "Signup" as nav labels.

### Active state behavior

- On `/feed` → **Feed** is highlighted.
- On `/join` → **Join** is highlighted.
- On `/dashboard` or `/dashboard/*` → **Dashboard** is highlighted.

---

## Route and UI naming

- **Route and UI names must match** the canonical names above.
- **Do not use legacy terms** in IA, routes, or nav:
  - Use **Feed**, not "Directory".
  - Use **Join**, not "Signup".

Legacy routes redirect: `/signup` → `/join`, `/u/:handle` → `/profile/:handle`.
The route `/directory` is used for people discovery (navbar search, Discover
People) and is not shown in the nav; the nav label is **Feed** (links to
`/feed`).

---

## Profile vs Dashboard

| Concept       | Role                                                    |
| ------------- | ------------------------------------------------------- |
| **Profile**   | Public identity at `/profile/:handle`. What others see. |
| **Dashboard** | Private control: settings, activity, account.           |

---

## Authenticated User Routing

| Scenario                        | Route                                                           |
| ------------------------------- | --------------------------------------------------------------- |
| Auth user visits `/`            | Redirect to `/feed`                                             |
| Owner on own `/profile/:handle` | Read-only; no redirect                                          |
| Owner wants to edit profile     | `/dashboard` (Edit Profile dialog)                              |
| Dashboard sub-routes (future)   | `/dashboard/settings`, `/activity`, `/notifications`, `/intent` |

---

## Related docs

- [Spike: Profile vs Dashboard IA](./spike-profile-dashboard-ia.md) — canonical
  model (Option B).
- [Platform NFRs](./platform-nfrs.md) — constraints for Feed, Join, workflows.
- [Auth requirements](../auth-requirements.md) — registration and Join flow.
