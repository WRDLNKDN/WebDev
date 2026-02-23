# EPIC: Admin Governance Surface

[← Docs index](../README.md)

## Type

Task

## Scope

Long-lived architectural surface

## Canonical Route

`/admin`

### Sub-routes

- `/admin`
- `/admin/content`
- `/admin/chat-reports`
- `/admin/advertisers`
- `/admin/community-partners`

## Description

Admin is a role-scoped governance surface used to manage platform safety,
content, advertisers, and community partners.

- Admin is not public.
- Admin is not owner-scoped.
- Admin requires authenticated user with admin role.
- Unauthorized access returns deterministic `403` UI state.

Admin configures. Member-facing surfaces render.

## Core Domains

### 1) Content Moderation

Route: `/admin/content`

- Review and approve/reject video submissions
- Remove published content
- Enforce suspensions/bans for violations

### 2) Chat Reports

Route: `/admin/chat-reports`

- Review reported chat messages
- Resolve conduct violations
- Suspend or ban users when required

### 3) Advertisers

Route: `/admin/advertisers`

- Add/edit advertisers
- Enable/disable advertisers
- Define display frequency (for Feed insertion cadence)
- Define deterministic ordering
- Affects Feed rendering only

### 4) Community Partners

Route: `/admin/community-partners`

- Add/edit partner listings
- Upload logos
- Define public description and URL
- Define explicit display order
- Enable/disable listing
- Public surface: `/community-partners`

Admin manages. Public surface renders.

## Enforcement Model

Admin may set member status to enforce access policy.

Current schema statuses are `pending`, `approved`, `rejected`, `disabled` with
frontend enforcement for disabled-like states and role/RLS enforcement in
Supabase.

Target policy semantics map to:

- `active`
- `suspended`
- `banned`

When not active:

- Immediate session invalidation
- Deterministic `403` behavior across authenticated surfaces
- Audit logging required
- Public profile visibility policy must be explicit

## Determinism Requirements

- Advertiser ordering must be explicit
- Community Partner ordering must be explicit
- No engagement weighting
- No algorithmic ranking

## Explicit Boundaries

Admin must not:

- Replace Dashboard
- Replace Profile
- Render Feed content directly
- Be publicly accessible
- Introduce new surfaces without IA update

## Success Signals

- Admin can moderate content safely
- Admin can manage advertisers deterministically
- Admin can manage community partners deterministically
- Enforcement removes access immediately
- No IA boundary violations
