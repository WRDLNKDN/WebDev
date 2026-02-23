# Beta Notes

## Feed and Partners update

- Removed the Feed right-rail module for Beta (Community Partners card and
  Weirdling generator entrypoint).
- Added a dedicated public page at `/community-partners`.
- Added a footer link to `Community Partners` under the Company section.
- Community Partners now sources from a dedicated `community_partners` table
  (decoupled from feed ads).
- Added separate Admin management surface at `/admin/partners` (distinct from
  `/admin/advertisers`).
- Partner content should not be created in `feed_advertisers`; Ads and Partners
  are now separate content surfaces.
- Feed ad slots still render every 6 posts, but active advertisers are now
  shuffled with a per-session seed to keep ordering stable during a member
  session.
- Added per-session ad impression caps to avoid over-serving the same ad in a
  long browsing session.
- Feed ad tuning can be configured with `VITE_FEED_AD_EVERY_N_POSTS` and
  `VITE_FEED_AD_IMPRESSION_CAP`.
- Feed now persists `feed_ad_impression` / `feed_ad_click` events to
  `feed_ad_events`, and Admin Advertisers shows impressions, clicks, and CTR
  with selectable 7d/30d/90d windows.
- Admin ad/partner image uploads now allow JPG/PNG/WEBP/GIF up to 50MB.
- Admin upload errors now return actionable messages for invalid type, oversized
  files, and storage failures.
- Auth callback, sign-in, chat group creation, and Weirdling generation now use
  shared friendly error normalization so raw technical messages are less likely
  to appear in member/admin UI.
- Nettica fallback is enabled by default and can be disabled with
  `VITE_ENABLE_NETTICA_PARTNER_FALLBACK=false` to reveal the empty-state
  variant.
- Added lightweight analytics events for footer and outbound partner clicks.
- Added analytics sink registration in app bootstrap so emitted events can flow
  to `gtag`/`plausible` when present.

## Ops migration note

- Existing UAT/PROD rows in `feed_advertisers` that represent partner profiles
  (instead of ad creatives) should be moved to `community_partners`.
- Keep `feed_advertisers` for Feed ad inventory only.

## Signup mobile behavior

- Updated `/join` container layout to support reliable vertical scroll on mobile
  viewports.
- Added a mobile-only Playwright check for `/join` scroll behavior.

## Avatar consistency and presets

- Edit Profile now uses preset Weirdling selection only (7 options) and removes
  the "customize" entrypoint from that flow.
- Preset tiles are square and display without visible per-avatar title text.
- Greenling is the default avatar fallback when no saved avatar/provider photo
  exists.
- For OAuth sign-in, provider photo fallback now hydrates globally (including
  Navbar avatar) so the avatar shown in Edit Profile and app chrome stays
  consistent.
- Dashboard identity chips now show real selected values (skills and industry)
  instead of generic "Builder Tags"/"Edit Profile" chips.
- Dashboard top action strip now keeps Edit Profile and removes the separate
  Settings entrypoint.

## Link manager quality update

- Edit Links now requires Platform selection before adding a link and shows
  inline validation when missing.
- Platform options now include TikTok, YouTube, Substack, Medium, Patreon, and
  Calendly plus an `Other` option (generic web icon fallback).
- Current Links in Edit Links are grouped by Category with deterministic
  in-category ordering.
- Profile link rendering now prefers the stored `platform` metadata (with URL
  detection fallback for legacy links) so icon/label consistency is preserved.

## Resume thumbnail expansion

- Resume upload now supports `.doc` in addition to `.pdf` and `.docx`.
- Added authenticated server-side thumbnail generation for Word resumes
  (`.doc`/`.docx`) at upload time.
- Generated thumbnails are persisted and reused from profile metadata so
  Dashboard and public Profile render a deterministic preview state: `pending`,
  `complete`, or `failed`.
- Owners now get a `Retry Preview` action when a Word thumbnail generation
  attempt fails.
- Admin dashboard now includes a resume-thumbnail ops summary (`pending`,
  `complete`, `failed`, and recent failures) for governance visibility.
- Added `/admin/resume-thumbnails` drill-down for failure inspection, one-click
  per-member retry, and deterministic backfill batches.
- Added a backfill concurrency lock and run-history telemetry surfaced in admin
  summary/details to prevent overlapping operations.
