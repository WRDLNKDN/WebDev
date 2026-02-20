# Documentation Index

Central index for WRDLNKDN WebDev documentation.

## Docs

- [Terminology and Language Standards](./TERMINOLOGY.md) — Canonical vocabulary
  for UI, docs, EPICs, and UX copy. No drift without approval.
- [IA Baseline](./architecture/ia-baseline.md) — Canonical architectural
  contract for routes, surfaces, and navigation (Phase 1).
- [Information architecture](./architecture/information-architecture.md) —
  Canonical routes, navigation labels, public vs authenticated access; single
  source of truth for Home, Feed, Directory, Join, Profile, Dashboard.
- [Auth & password requirements](./auth-requirements.md) — User and admin
  authentication; password/OAuth and admin access rules.
- [OAuth sign-in display name](./auth-oauth-display-name.md) — How to show
  wrdlnkdn.com instead of Supabase domain on Google sign-in.
- [UAT vs PROD deployment](./DEPLOYMENT_UAT_PROD.md) — Supabase project IDs; fix
  UAT showing PROD URL on sign-in.
- [Branded auth domains](./BRANDED_AUTH_DOMAINS.md) — Replace `*.supabase.co`
  with branded WRDLNKDN auth domains (auth-uat.wrdlnkdn.com, auth.wrdlnkdn.com).
- [Sign-in loop analysis](./SIGNIN_LOOP_ANALYSIS.md) — Analysis of post-Join
  sign-in loop and implemented safeguards.
- [Platform NFRs](./architecture/platform-nfrs.md) — Non-functional requirements
  (operational, scalability, security).
- [API Layer](./architecture/api-layer.md) — Frontend–backend API contract and
  response envelope.
- [ADR: Unified signup wizard](./architecture/adr-unified-signup-wizard.md) —
  Decision record for the Join flow (onboarding wizard implementation).
- [ADR: Site chrome consolidation](./architecture/adr-site-chrome-consolidation.md)
  — Vercel as source of truth for header, footer, hero, and navigation.
- [Epic: Ecommerce and Storefront](./architecture/epic-ecommerce-storefront.md)
  — Embed-first Ecwid storefront (MVP scope and acceptance).
- [Epic: Personalized Weirdling Generator](./architecture/epic-weirdling-generator.md)
  — AI API backend, wizard UX, MVP model conformance.
- [Epic: Home](./architecture/epic-home.md) — Pre-signin public brand surface at
  `/`; single Join Us CTA, hero animation, no OAuth on Home.
- [Epic: Join](./architecture/epic-join.md) — Authentication and onboarding at
  `/join`; OAuth entry, profile provisioning, partial-state reconciliation.
- [Epic: Feed](./architecture/epic-feed.md) — Content and activity surface at
  `/feed`; post rendering, reactions, visibility rules.
- [Epic: Directory](./architecture/epic-directory.md) — Member discovery at
  `/directory`; search, filters, profile navigation.
- [Epic: Notifications](./architecture/epic-notifications.md) — In-app activity
  signals at `/dashboard/notifications`; reactions, comments, mentions, chat.
- [Epic: Events](./architecture/epic-events.md) — Community gatherings at
  `/events`; create, RSVP, deterministic ordering.
- [Epic: API Layer](./architecture/epic-api-layer.md) — Frontend–backend secure
  communication; auth, content submission, moderation (implemented vs planned).
- [Epic: IA Baseline](./architecture/epic-ia-baseline.md) — Core information
  architecture; canonical routes, surfaces, navigation labels.
- [Epic: Home Dashboard](./architecture/epic-home-dashboard.md) —
  Profile-centric landing experience; identity, portfolio, status, friends (MVP
  scope).
- [Directory API](./directory.md) — Member discovery, search, filters,
  connection actions (authenticated only).
- [Feeds API](./feeds-api.md) — Activity stream, posts, external links, RLS.
- [Chat MVP spec](./chat/MVP_CHAT_SPEC.md) — 1:1 and group messaging.
- [Chat report email setup](./chat/REPORT_EMAIL_SETUP.md) — Email notifications
  for chat reports.
- [Chat NFR: Storage & backup](./chat/NFR_STORAGE_BACKUP.md) — Supabase storage
  and backup requirements.
- [Chat NFR: Monitoring](./chat/NFR_MONITORING.md) — Observability for chat.
- [Mobile & error audit](./MOBILE_AND_ERROR_AUDIT.md) — Layout responsiveness
  and error message improvements.
- [Guide: Weirdling Architecture](./architecture/weirdling-architecture-guide.md)
  — Visual constraints, safety rules, and contribution patterns for Weirdlings.
- [Development](./development/copilot-instructions.md) — Copilot / dev tooling
  instructions.
- [Feed post buttons](./development/feed-post-buttons.md) — Post and Link button
  behavior in the Feed composer.
- [Markdownlint](./development/markdownlint.md) — Why `--fix` doesn't fix
  everything; pre-commit and commands.
- [PR testing steps](./testing/pr-testing-steps.md) — Checklist for pre-merge
  testing.
- [Beta notes](./BETA_NOTES.md) — Current Beta-scope adjustments and temporary
  decisions.

## Governance (API & Data Layer)

- [RLS Audit](./governance/RLS_AUDIT.md) — Supabase schema and RLS coverage.
- [Auth config parity](./governance/AUTH_CONFIG_PARITY.md) — UAT vs PROD OAuth
  and redirect URLs.
- [Profile provisioning](./governance/PROFILE_PROVISIONING.md) — Deterministic
  profile creation after auth.
- [Sorting rules](./governance/SORTING_RULES.md) — Deterministic Feed and
  Directory ordering.

## See also

- [Project README](../README.md) — Overview, stack, getting started.
- [Supabase README](../supabase/README.md) — Schema, migrations, OAuth setup.
- [Contributing](../CONTRIBUTING.md) — How to contribute.
- [Integration](../INTEGRATION.md) — Integration notes.
- [Backend README](../backend/README.md) — API server and backend setup.
- [Frontend README](../frontend/README.md) — Frontend structure.
- [Voiceover assets](../public/assets/voiceover/README.md) — Bumper voiceover
  and video.
- [Video assets](../public/assets/video/README.md) — Hero and bumper videos.
