# Member-only routes (routing fences)

Routes that require a **signed-in, onboarded Member** use `RequireOnboarded` in
`src/app/routing/AppRouteTree.tsx`. Behavior is the same in **local, UAT, and
production** (no env-specific bypass).

## Guard behavior

- **`RequireOnboarded`** — Session required; profile row required; incomplete
  onboarding redirects to `/join`; no session redirects to `/` (with
  `state.from` for return navigation where applicable).
- **`RequirePublicSiteLive`** — Blocks **Join** / **Sign in** when the site is
  in public **coming soon** mode (marketing shell only).
- **`RequireFeatureFlag`** — Feature off → `fallbackTo` path (that path may
  itself be member-only).

## Member-only (non-exhaustive — see `AppRouteTree`)

| Area                 | Path pattern                                                 | Notes                                     |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Feed                 | `/feed`                                                      | + `FEED_FLAG`                             |
| Saved                | `/saved`                                                     | Same UI as feed (`savedMode`)             |
| Directory            | `/directory`                                                 | + `directory` flag                        |
| Events               | `/events`, `/events/:id`                                     | + `events` flag                           |
| Groups               | `/groups`                                                    | + `GROUPS_FLAG`; `/forums` redirects here |
| Dashboard            | `/dashboard`, `/dashboard/*`                                 | + `DASHBOARD_FLAG`                        |
| Settings             | `/dashboard/settings/*`                                      | Nested under dashboard guard              |
| Notifications        | `/dashboard/notifications`                                   |                                           |
| Games (in dashboard) | `/dashboard/games/*`                                         |                                           |
| Chat                 | `/chat`, `/chat/:roomId`, `/chat-full`, `/chat-full/:roomId` |                                           |
| Chat popup           | `/chat-popup/:roomId`                                        | Outside `Layout`                          |
| Submit               | `/submit`                                                    |                                           |
| Weirdling            | `/weirdling/create`                                          |                                           |

## Intentionally public (examples)

| Path                                         | Purpose                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `/`, `/home`                                 | Marketing / signed-out home                                                 |
| `/join`, `/signin`                           | Auth entry (gated by coming soon via `RequirePublicSiteLive` where wrapped) |
| `/profile/:handle`                           | Public Profile (identity page for sharing / discovery)                      |
| `/p/:shareToken`                             | Public Profile share link                                                   |
| `/projects/:id`                              | Portfolio project view; **Edit** is owner-only in-page                      |
| `/store`                                     | Storefront (+ `store` flag)                                                 |
| `/playlists`, `/playlists/:slug`             | Public curated playlists API                                                |
| `/about`, `/help`, `/advertise`, legal pages | Marketing / support                                                         |

## Automated checks

- **Playwright:** `src/tests/e2e/auth/member-only-routes-anonymous.spec.ts` —
  clears storage, hits a list of member paths (feed, saved, groups, dashboard,
  notifications, chat routes, submit, directory, events, weirdling), expects
  pathname `/` (no session).
- **Chat UI helper:** `src/lib/utils/chatUiForMember.ts` — single predicate for
  “chat feature + signed-in Member” in Layout, Messenger overlay, Navbar, Feed;
  covered by `src/tests/lib/chatUiForMember.test.ts`.

## Future product options

- If product ever requires **no** public profiles on UAT/PROD, wrap
  `/profile/:handle` in a small guard (e.g. env + `RequireOnboarded`) — today
  that would break discovery links from Directory/Landing.
