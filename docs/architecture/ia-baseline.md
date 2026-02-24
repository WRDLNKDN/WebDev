<!-- markdownlint-disable MD013 MD060 -->

# IA Baseline — Canonical Information Architecture

**Type:** Architectural Contract  
**Priority:** High  
**Milestone:** Phase 1  
**Reference:** All future IA amendments must reference this baseline.

This document defines the canonical WRDLNKDN Information Architecture for MVP.
It serves as the architectural contract for surface structure.

**Note:** Final Dashboard vs Profile rendering model pending outcome of SPIKE:
Profile and Dashboard Surface Ownership Clarification. This baseline remains
neutral regarding Profile vs Dashboard rendering mode.

---

## Canonical IA (Route Structure)

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
├── events                  Authenticated
│   ├── route: /events
│   └── /events/:id
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

## Surface Responsibilities

| Surface           | Responsibility                                                          |
| ----------------- | ----------------------------------------------------------------------- |
| **Home**          | Public brand and intent surface.                                        |
| **Join**          | Authentication and onboarding entry surface.                            |
| **Feed**          | Content and activity stream surface.                                    |
| **Directory**     | Searchable, filterable member discovery surface.                        |
| **Events**        | Community gatherings, RSVPs, scheduled interaction. Distinct from Feed. |
| **Profile**       | Public identity surface.                                                |
| **Dashboard**     | Private control surface (may resolve to profile owner mode per SPIKE).  |
| **Notifications** | Private control surface; in-app activity signals. Distinct from Feed.   |

---

## Navigation Rules

### Primary nav labels (must match route names)

- **Home** — links to `/`
- **Feed** — when logged in, links to `/feed`
- **Directory** — when logged in, links to `/directory`
- **Events** — when logged in, links to `/events`
- **Join** — when signed out, links to `/join`
- **Dashboard** — when logged in, links to `/dashboard` (if distinct surface)
- **Profile** — direct link to identity surface when applicable
- **Notifications** — when logged in, links to `/dashboard/notifications` (badge
  in nav)

### Legacy terms prohibited

- **Join** — never use Signup
- **Directory renamed to Feed** — prohibited; Feed = activity stream, Directory
  = people discovery
- **Feed used for people discovery** — prohibited; Directory is people discovery

### Active state

Active state must reflect canonical route:

- On `/feed` → Feed highlighted
- On `/directory` → Directory highlighted
- On `/events` or `/events/:id` → Events highlighted
- On `/dashboard` or `/dashboard/*` → Dashboard highlighted
- On `/join` → Join highlighted

---

## Public vs Authenticated

### Public

- Home
- Join
- Profile (unless future policy changes)

### Authenticated

- Feed
- Directory
- Events
- Dashboard (includes Notifications at /dashboard/notifications)
- Chat (if enabled)

Protected routes must redirect deterministically to `/join` if unauthenticated.

---

## Requirements Checklist

- [x] Route names match this structure
- [x] Navigation labels match route names
- [x] No ambiguous surface naming
- [x] Documentation reflects this baseline

---

## Related Docs

- [Information Architecture](./information-architecture.md) — expanded IA and
  nav model
- [Spike: Profile vs Dashboard IA](./spike-profile-dashboard-ia.md) — render
  mode decision
