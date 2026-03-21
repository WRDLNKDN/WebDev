# Testing

[← Docs index](../README.md)

Overview of automated tests and how they align with documentation.

## Commands

| Command              | What it runs                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run test`       | Vitest (watch mode)                                   |
| `npm run test:run`   | Vitest single run (used in `npm run check`)           |
| `npm run test:unit`  | Same as `test:run`                                    |
| `npm run test:rls`   | Vitest with RLS config (`vitest.rls.config.ts`)       |
| `npm run test:e2e`   | Playwright e2e (all specs)                            |
| `npm run check:full` | `check` + `test:e2e`                                  |
| `npm run check`      | typecheck + eslint + markdownlint + prettier + Vitest |

See [PR testing steps](./pr-testing-steps.md) for pre-merge checklist; preferred
e2e command there is `npm run test:e2e`.

For manual UAT sign-off of Dashboard modal and Resume card fixes, see
[UAT checklist](./UAT_CHECKLIST.md).

## E2E (Playwright)

All e2e specs live under `src/tests/e2e/`. By default they run on **Chromium**
and **Firefox** (see `playwright.config.ts` `projects`). Use
`--project=chromium` or `--project=firefox` to run a single browser.

**Backend + Vite:** Playwright loads `.env` then `.env.local` from the repo root
(same pattern as the API). If both `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set (see [`.env.example`](../../.env.example)),
it starts the Express API and Vite together. If either is missing, only Vite
runs and most specs rely on network stubs—still valid for CI.

**Frontend-only even with a full `.env`:**
`PLAYWRIGHT_FRONTEND_ONLY=1 npm run test:e2e` (or unset the two `SUPABASE_*`
vars for that shell).

| Spec                                        | Purpose                                                                                                         | Documented / notes                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `advertise-modal.spec.ts`                   | Footer/company CTA opens Advertise modal; validates required URL                                                | Covers modal scroll, validation, and submission payload                                                                |
| `accessibility.spec.ts`                     | WCAG 2a/2aa/21aa route sweep (public + authenticated)                                                           | [AAA_BACKLOG](../accessibility/AAA_BACKLOG.md); [Agentic protocol](../../AGENTICPROTOCOL.md) — run for UI/a11y changes |
| `dashboard-share-modal.spec.ts`             | Dashboard share link moved to Profile dropdown modal                                                            | Ensures inline panel stays removed and modal actions still work                                                        |
| `feed-edit-comment.spec.ts`                 | Feed post/comment edit persistence                                                                              | Currently `test.fixme` until feed stub is hit in e2e env ([COMMIT_MEMO](../../COMMIT_MEMO.md))                         |
| `feed-reaction-picker.spec.ts`              | Feed reaction picker hover-open behavior and canonical colors                                                   | Validates Care/Happy color mapping and hover exposure                                                                  |
| `chat-file-upload.spec.ts`                  | Chat: attach file, send; no permanent upload spinner                                                            | —                                                                                                                      |
| `footer-donate-modal.spec.ts`               | Donate CTA opens modal with URL, copy action, and QR                                                            | Verifies modal behavior on desktop and mobile                                                                          |
| `footer-layout.spec.ts`                     | Footer compact layout, donate placement, and mobile fit                                                         | Verifies removed Platform group and compact layout expectations                                                        |
| `home-hero.spec.ts`                         | Pre-sign-in hero hierarchy and copy                                                                             | Verifies current brand/title/pronunciation/tagline structure                                                           |
| `signup-completion.spec.ts`                 | Sign-up / join flow integrity                                                                                   | —                                                                                                                      |
| `home.spec.ts`                              | Home / admin route reachable + axe on main                                                                      | —                                                                                                                      |
| `auth/member-only-routes-anonymous.spec.ts` | Anonymous users redirected off member paths (feed, saved, dashboard, chat, directory, events, submit, …) to `/` | [MEMBER_ONLY_ROUTES](../MEMBER_ONLY_ROUTES.md)                                                                         |
| `community-partners.spec.ts`                | `/community-partners` loads; Nettica fallback when list empty                                                   | [pr-testing-steps §7](./pr-testing-steps.md#7-community-partners-page)                                                 |
| `admin-resume-thumbnails.spec.ts`           | Admin: Resume Thumbnails nav/route deprecation                                                                  | —                                                                                                                      |
| `directory-manage.spec.ts`                  | Directory: Manage menu, Disconnect/Block confirmation dialogs                                                   | [pr-testing-steps §3](./pr-testing-steps.md#3-directory-page)                                                          |
| `edit-profile-smoke.spec.ts`                | Edit Profile: open from Dashboard, change bio, save, dialog closes                                              | —                                                                                                                      |
| `portfolio-categories.spec.ts`              | Public profile category section rendering and preview modal                                                     | Covers grouped sections under Portfolio Showcase                                                                       |
| `portfolio-edit.spec.ts`                    | Dashboard portfolio artifact editing flow                                                                       | Covers title/description/link/media/category/highlight updates                                                         |
| `portfolio-highlights.spec.ts`              | Highlights carousel ordering, navigation, and mobile fit                                                        | Covers carousel render above category sections                                                                         |
| `share-profile-route.spec.ts`               | Public share profile route and resume filename rendering                                                        | Covers `/p/:shareToken` and resume filename tooltip behavior                                                           |

## Unit / integration (Vitest)

Tests live under `src/tests/` (and `backend/` where applicable). Run with
`npm run test:run` or `npm run test`.

| Area          | Files                                                                                                                                                                                                  | Purpose                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Chat          | `chat/attachmentValidation.test.ts`, `chat/attachmentMeta.test.ts`                                                                                                                                     | Attachment validation and metadata                                                                     |
| Notifications | `notifications/notificationLinks.test.ts`                                                                                                                                                              | Notification link generation                                                                           |
| Governance    | `governance/migrationsIdempotent.test.ts`, `feedAdEventsRls.test.ts`, `communityPartnersRls.test.ts`, `api-integrity.test.ts`, `api-integration.test.ts`                                               | Migrations idempotence, RLS, API contract                                                              |
| Feed          | `feed/feedsApi.test.ts`, `feed/imagePreviewState.test.ts`, `feed/adRotation.test.ts`, `feed/deepLink.test.ts`                                                                                          | Feeds API, image preview, ad rotation, deep links                                                      |
| Weirdling     | `weirdling.validate.test.ts`                                                                                                                                                                           | Weirdling schema validation                                                                            |
| Links         | `linkPlatform.test.ts`                                                                                                                                                                                 | Link platform parsing and duplicate URL normalization                                                  |
| Marketing     | `marketing/advertiseValidation.test.ts`                                                                                                                                                                | Advertise modal URL validation                                                                         |
| Errors        | `errors.test.ts`                                                                                                                                                                                       | Error handling helpers                                                                                 |
| Chat / shell  | `lib/chatUiForMember.test.ts`                                                                                                                                                                          | `chatUiForMember()` predicate for chat nav + messenger                                                 |
| RLS           | `rls/admin-visbility.test.ts`, `rls/profile.rls.test.ts`                                                                                                                                               | Admin visibility, profile RLS (use `test:rls` where needed)                                            |
| Events        | `events/blockedFilter.test.ts`                                                                                                                                                                         | Blocked-user filtering for events                                                                      |
| Smoke         | `smoke.test.ts`                                                                                                                                                                                        | Basic smoke                                                                                            |
| Admin         | `admin/advertiserPayload.test.ts`                                                                                                                                                                      | Advertiser payload shape                                                                               |
| Directory     | `directory/connectionState.test.ts`, `directory/connectionFlow.test.ts`, `directory/directoryApi.test.ts`                                                                                              | Connection state labels, connection flow helpers, directory query string                               |
| Profile       | `profile/validateIndustryGroups.test.ts`                                                                                                                                                               | Edit Profile industry groups validation (max 5, 8 sub, no duplicates)                                  |
| Portfolio     | `portfolio/portfolioSections.test.ts`, `portfolio/projectCategories.test.ts`, `portfolio/projectStorage.test.ts`, `portfolio/resumeDisplayName.test.ts`, `portfolio/resumeThumbnailGeneration.test.ts` | Section grouping, category normalization, storage cleanup, resume display naming, thumbnail generation |
| Reactions     | `post/reactionOptions.test.ts`                                                                                                                                                                         | Canonical Feed reaction label/color mapping                                                            |

Additional portfolio unit coverage:

- `portfolio/toggleProjectHighlight.test.ts` (highlight toggle persistence)

## Documentation that references tests

- **Run e2e before merge:**
  [pr-testing-steps.md §10](./pr-testing-steps.md#10-smoke--build) —
  `npm run test:e2e`
- **Run a11y for UI/a11y changes:**
  [AGENTICPROTOCOL.md](../../AGENTICPROTOCOL.md),
  [POST_UNIFICATION_PLAN.md](../architecture/POST_UNIFICATION_PLAN.md) —
  `accessibility.spec.ts`
- **Accessibility sweep file:**
  [AAA_BACKLOG.md](../accessibility/AAA_BACKLOG.md) —
  `src/tests/e2e/accessibility.spec.ts`
- **Feed edit/comment e2e fixme:** [COMMIT_MEMO.md](../../COMMIT_MEMO.md)

## Gaps (tests not yet documented here)

None; this file is the inventory. When adding a new Vitest file or e2e spec, add
a row to the tables above.

## Optional coverage

- Member-only route fences (anonymous redirects) —
  **`auth/member-only-routes-anonymous.spec.ts`**.
- Directory Manage/Disconnect/Block and Edit Profile smoke —
  `directory-manage.spec.ts`, `edit-profile-smoke.spec.ts`.
