<!-- markdownlint-disable MD013 MD060 -->

# Information Architecture (IA)

[← Docs index](../README.md)

**Single source of truth** for WRDLNKDN MVP page names, routes, access rules,
and navigation. Use this doc for design, engineering, and onboarding.

**Baseline:** See [IA Baseline](./ia-baseline.md) for the canonical
architectural contract. All future IA amendments must reference that baseline.

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
├── directory               Authenticated
│   └── route: /directory
│
├── profile                 Public
│   └── route: /profile/:handle
│
└── dashboard               Authenticated
    ├── route: /dashboard
    ├── /dashboard/profile
    ├── /dashboard/activity
    ├── /dashboard/intent
    ├── /dashboard/notifications
    └── /dashboard/settings
```

---

## Public vs Authenticated Access

| Page      | Access        | Route(s)             |
| --------- | ------------- | -------------------- |
| Home      | Public        | `/`                  |
| Join      | Public        | `/join`              |
| Feed      | Authenticated | `/feed`              |
| Directory | Authenticated | `/directory`         |
| Profile   | Public\*      | `/profile/:handle`   |
| Dashboard | Authenticated | `/dashboard` and sub |

\*Profile may be restricted to authenticated-only if product requires it.

---

## Navigation Model

### Primary navigation labels

- **Home** — always (links to `/`)
- **Feed** — when logged in (links to `/feed`) — content and activity stream
- **Directory** — when logged in (links to `/directory`) — member discovery
- **Join** — when logged out (links to `/join`)
- **Dashboard** — when logged in (links to `/dashboard`) — private control
  surface
- **Store** — if present (out of scope for this IA unless already live)

Legacy terms prohibited: **Signup** (use Join). Do not conflate Feed with
Directory: Feed = activity stream, Directory = people discovery.

### Active state behavior

- On `/feed` → **Feed** is highlighted.
- On `/directory` → **Directory** is highlighted.
- On `/join` → **Join** is highlighted.
- On `/dashboard` or `/dashboard/*` → **Dashboard** is highlighted.

---

## Route and UI naming

- **Route and UI names must match** the canonical names above.
- **Legacy terms prohibited:** Use **Join** (not Signup). Feed and Directory are
  distinct: **Feed** = activity stream, **Directory** = member discovery.

Legacy routes redirect: `/signup` → `/join`, `/u/:handle` → `/profile/:handle`.

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

- [IA Baseline](./ia-baseline.md) — canonical architectural contract.
- [Spike: Profile vs Dashboard IA](./spike-profile-dashboard-ia.md) — render
  model (Option B).
- [Platform NFRs](./platform-nfrs.md) — constraints for Feed, Join, workflows.
- [Auth requirements](../auth-requirements.md) — registration and Join flow.
