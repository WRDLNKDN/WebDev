# Portfolio Showcase

[← Docs index](../README.md)

Current Portfolio Showcase behavior across Dashboard, owner profile, and public
share profile.

## Dashboard

Users can manage portfolio artifacts from the Dashboard Portfolio section.

- Add artifacts with:
  - title
  - description
  - destination URL
  - optional preview image
  - one or more categories
  - optional highlight toggle
- Edit existing artifacts with the same fields.
- Delete artifacts. Delete removes the row and associated storage objects.
- Reorder artifacts with drag-and-drop. `sort_order` is the canonical display
  order.

## Profile surfaces

Portfolio Showcase renders in this order:

1. Resume card, when a resume exists
2. Highlights carousel, when one or more artifacts are marked
   `is_highlighted = true`
3. Category sections containing project cards

### Highlights carousel

- Uses highlighted artifacts only
- Follows saved artifact order (`sort_order`)
- Auto-advances
- Pauses on hover/focus/interaction
- Supports manual left/right navigation
- Supports swipe on touch devices

### Category sections

- Render only when artifacts exist for that category
- Use the artifact category list as the section source
- Artifact cards remain responsive across desktop, tablet, and mobile
  breakpoints

## Data model

Portfolio artifacts live in `public.portfolio_items`.

Relevant columns:

- `title`
- `description`
- `project_url`
- `image_url`
- `tech_stack`
- `sort_order`
- `is_highlighted`
- `normalized_url`
- `embed_url`
- `resolved_type`
- `thumbnail_url`
- `thumbnail_status`

Per repository convention, these columns are maintained in the canonical
Supabase tables migration:

- [`supabase/migrations/20260121180000_tables.sql`](../../supabase/migrations/20260121180000_tables.sql)

RLS and storage policies remain in:

- [`supabase/migrations/20260121180005_rls.sql`](../../supabase/migrations/20260121180005_rls.sql)

## Verification

Relevant automated coverage:

- `src/tests/e2e/portfolio-edit.spec.ts`
- `src/tests/e2e/portfolio-categories.spec.ts`
- `src/tests/e2e/portfolio-highlights.spec.ts`
- `src/tests/e2e/share-profile-route.spec.ts`
- `src/tests/portfolio/portfolioSections.test.ts`
