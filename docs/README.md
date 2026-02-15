# Documentation Index

Central index for WRDLNKDN WebDev documentation.

## Docs

- [Terminology and Language Standards](./TERMINOLOGY.md) — Canonical vocabulary
  for UI, docs, EPICs, and UX copy. No drift without approval.
- [Information architecture](./architecture/information-architecture.md) —
  Canonical routes, navigation labels, public vs authenticated access; single
  source of truth for Home, Feed, Join, Profile, Dashboard.
- [Auth & password requirements](./auth-requirements.md) — User and admin
  authentication; password/OAuth and admin access rules.
- [Platform NFRs](./architecture/platform-nfrs.md) — Non-functional requirements
  (operational, scalability, security).
- [API Layer](./architecture/api-layer.md) — Frontend–backend API contract and
  response envelope.
- [ADR: Unified signup wizard](./architecture/adr-unified-signup-wizard.md) —
  Decision record for the Join flow (signup wizard implementation).
- [ADR: Site chrome consolidation](./architecture/adr-site-chrome-consolidation.md)
  — Vercel as source of truth for header, footer, hero, and navigation.
- [Epic: Ecommerce and Storefront](./architecture/epic-ecommerce-storefront.md)
  — Embed-first Ecwid storefront (MVP scope and acceptance).
- [Epic: Personalized Weirdling Generator](./architecture/epic-weirdling-generator.md)
  — AI API backend, wizard UX, MVP model conformance.
- [Epic: Home Dashboard](./architecture/epic-home-dashboard.md) —
  Profile-centric landing experience; identity, portfolio, status, friends (MVP
  scope).
- [Guide: Weirdling Architecture](./architecture/weirdling-architecture-guide.md)
  — Visual constraints, safety rules, and contribution patterns for Weirdlings.
- [Development](./development/copilot-instructions.md) — Copilot / dev tooling
  instructions.
- [Markdownlint](./development/markdownlint.md) — Why `--fix` doesn't fix
  everything; pre-commit and commands.

## See also

- [Project README](../README.md) — Overview, stack, getting started.
- [Supabase README](../supabase/README.md) — Schema, migrations, OAuth setup.
