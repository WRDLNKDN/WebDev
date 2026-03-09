# EPIC: Global Header (Navigation Shell)

[← Docs index](../README.md)

## Type

Task

## Scope

Long-lived cross-surface UI infrastructure

## Description

The Global Header is the persistent navigation shell rendered across surfaces.

- It adapts by authentication and role state.
- It is not a surface.
- It must not collapse surface responsibilities.
- It must remain deterministic.

## Rendering Contexts

### Public (not signed in)

Header includes:

- WRDLNKDN wordmark (links to `/`)
- Store
- Join (links to `/join`)
- Sign in (links to `/join`)

Header must not include:

- Feed
- Directory
- Events
- Dashboard
- Admin
- Notifications
- Avatar

### Authenticated (standard user)

Header includes:

- WRDLNKDN wordmark (links to `/`)
- Store
- Feed (`/feed`)
- Directory (`/directory`)
- Events (`/events`)
- Notification bell
- Dashboard (`/dashboard`)
- Search input
- User avatar
- Sign out
- Chat entry point (when globally enabled)

Header must not include:

- Admin link (unless role = admin)

### Authenticated (admin role)

All standard authenticated controls plus:

- Admin link (`/admin`)

Admin visibility is role-gated and unauthorized access returns deterministic
`403`.

## Core Responsibilities

- Deterministic navigation between canonical routes
- Reflect authentication state
- Reflect role state
- Show notification indicator
- Provide logout control
- Provide global search entry

Header must not:

- Render surface content
- Embed Feed, Directory, Events, or Chat business logic
- Introduce ranking/personalization beyond session state
- Contain domain business logic

## UAT Banner Behavior

In non-production environment configuration:

- Show persistent banner text:
  `UAT — This is a test environment. Data is not production.`
- Banner is visually distinct
- Banner does not change routing behavior
- Banner is not rendered in production
- Environment detection is config-driven

## Determinism Requirements

- Navigation labels map to canonical route names
- No conditional reordering of navigation items
- Notification count remains deterministic
- Role-based visibility is explicit and predictable

## Out of Scope

- Feature-level search implementation
- Chat rendering logic
- Notification logic beyond count display
- Mobile navigation redesign (unless separately scoped)

## Acceptance Criteria

- Public header renders only public controls
- Authenticated header renders authenticated controls
- Admin link renders only for admin role
- UAT banner renders only in UAT/non-production config
- No surface responsibilities collapse into header
- Navigation routes match canonical IA
