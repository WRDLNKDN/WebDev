# Canonical Profile & Dashboard Layout (UXUE)

Dashboard is the **canonical** implementation of the Profile layout. Profile
(handle view and share-token view) must render the same structure so users see
the same layout publicly as they do while editing.

## Surface order (all surfaces)

1. **Identity section** (three columns)
2. **Links section** (full width, below Identity)
3. **Portfolio Showcase** — Row 3: Carousel; Row 4: Item cards / detail view

Links must **not** appear in the Identity right column.

## Identity section structure (three columns)

| Column     | Content                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Left**   | Avatar. On Dashboard only: CTAs under avatar (Profile menu, Settings).                                                                                                                                      |
| **Center** | Display name, tagline, bio; then **Skills** (pills); then **Interests** (pills). Same pill styling for Skills and Interests; no "Skill:" or "Industry:" prefixes.                                           |
| **Right**  | **Industries only.** Grouped by primary industry (e.g. "Technology and Software" with sub-industries). "Other" (niche values) is a first-class group like any other primary industry, not standalone pills. |

### Components

- **IdentityHeader** with `layoutVariant="three-column"`: left = avatar +
  `slotUnderAvatar` (Dashboard CTAs); center = name, tagline, bio, `badges`
  (Skills + Interests pills), `actions` (Profile Connect/Edit when applicable);
  right = `rightColumn` (Industries only).
- **SkillsInterestsPills**: center column; Skills then Interests; no prefixes.
- **IndustryGroupBlock**: right column only; grouped primary/sub-industry
  sections; shared by Dashboard and Profile.
- **Links**: Rendered below Identity in a dedicated section (Dashboard:
  `DashboardLinksSection`; Profile: `ProfileLinksWidget` in a full-width block).

### Dashboard vs Profile

- **Dashboard**: `slotUnderAvatar` = Profile + Settings buttons. No Links in
  Identity. `DashboardLinksSection` below Identity.
- **Profile (handle / share-token)**: No CTAs under avatar. `actions` =
  Connect/Edit when applicable. Links section below Identity using
  `ProfileLinksWidget`. Same IndustryGroupBlock and SkillsInterestsPills.

## Portfolio Showcase order

- Row 3: **Profile Showcase Carousel** (`PortfolioHighlightsCarousel`)
- Row 4: **Profile Showcase Item Cards** (Resume card + project cards by
  category or sortable list on Dashboard)

## Implementation references

- Dashboard: `src/pages/dashboard/Dashboard.tsx` — IdentityHeader (three-column)
  → DashboardLinksSection → Portfolio Showcase.
- Profile (handle): `src/pages/profile/LandingPage.tsx` and
  `src/pages/profile/components/LandingPageContent.tsx` — same Identity + Links
  below + Portfolio.
- Profile (share token): `src/pages/profile/components/PublicProfileContent.tsx`
  — same structure.
- Identity: `src/components/profile/identity/IdentityHeader.tsx`,
  `SkillsInterestsPills.tsx`, `IndustryGroupBlock.tsx`.

Do not add Links to `rightColumn` or use a legacy industry pill layout in the
center column; use IndustryGroupBlock in the right column only.
