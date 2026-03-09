<!-- markdownlint-disable MD013 MD060 -->

# Epic: IA — Define and Document Core Information Architecture

[← Docs index](../README.md)

**Type:** Feature  
**Area:** Information Architecture / Navigation  
**Priority:** High  
**Milestone:** Phase 1

This issue establishes the canonical WRDLNKDN Information Architecture for MVP.
It defines core surfaces, canonical routes, public vs authenticated boundaries,
navigation label conventions, and active state rules. This document serves as
the baseline architectural contract.

---

## 1. Canonical IA (Baseline)

```text
/
├── home                    Public       route: /
├── join                    Public       route: /join
├── feed                    Authenticated route: /feed
├── directory               Authenticated route: /directory
├── profile                 Public       route: /profile/:handle
└── dashboard               Authenticated route: /dashboard
    ├── /dashboard/profile
    ├── /dashboard/activity
    ├── /dashboard/intent
    ├── /dashboard/notifications
    └── /dashboard/settings
```

---

## 2. Surface Responsibilities

| Surface       | Responsibility                                   |
| ------------- | ------------------------------------------------ |
| **Home**      | Public brand and intent surface.                 |
| **Join**      | Authentication and onboarding entry surface.     |
| **Feed**      | Content and activity stream surface.             |
| **Directory** | Searchable, filterable member discovery surface. |
| **Profile**   | Public identity surface.                         |
| **Dashboard** | Private control surface.                         |

---

## 3. Requirements

- [x] Document canonical routes
- [x] Define navigation labels (Home, Feed, Directory, Join, Dashboard)
- [x] Define public vs authenticated boundaries
- [x] Remove legacy terms:
  - **Signup** → Join
  - **Directory** is distinct from Feed; Feed = activity stream, Directory =
    people discovery

---

## 4. Acceptance Criteria

- [x] IA document exists in repo ([ia-baseline.md](./ia-baseline.md))
- [x] Routes match canonical naming
- [x] Navigation labels match route names
- [x] No ambiguous surface ownership

---

## 5. Related Docs

- [IA Baseline](./ia-baseline.md) — architectural contract
- [Information Architecture](./information-architecture.md) — expanded IA and
  nav
- [Epic: Home](./epic-home.md)
- [Epic: Join](./epic-join.md)
