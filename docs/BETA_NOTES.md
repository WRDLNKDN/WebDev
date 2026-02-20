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
