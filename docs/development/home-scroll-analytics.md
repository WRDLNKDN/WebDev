# Home Scroll Analytics Queries

This guide helps UX quickly use the new Home scroll events:

- `home_below_fold_reached`
- `home_scroll_depth`

These events are emitted from `src/pages/home/Home.tsx` via `trackEvent()`.

## Event payloads

### `home_below_fold_reached`

Fires once per page load when a member reaches roughly 25% scroll depth.

Payload:

- `source` (`home`)
- `depth_percent` (number)

### `home_scroll_depth`

Fires milestone events at `25`, `50`, `75`, `100`.

Payload:

- `source` (`home`)
- `depth_percent` (number; milestone)
- `viewport_height` (number)
- `document_height` (number)

## Quick QA in browser (no backend required)

Use this in DevTools Console on `/`:

```js
window.addEventListener('wrdlnkdn:analytics', (e) => {
  const d = e.detail || {};
  if (
    d.event === 'home_below_fold_reached' ||
    d.event === 'home_scroll_depth'
  ) {
    console.log('[home-scroll-event]', d);
  }
});
```

Scroll the page and confirm milestone output.

## Plausible usage (if enabled)

If `window.plausible` is configured, events are forwarded automatically by
`registerAnalyticsSinks()`.

In Plausible:

1. Go to **Events**.
2. Filter to:
   - `home_below_fold_reached`
   - `home_scroll_depth`
3. For depth analysis, break down `home_scroll_depth` by `depth_percent`.

Suggested UX KPI:

- **Below-fold reach rate** = `home_below_fold_reached` / homepage visits

## GA4 BigQuery query examples (if export is enabled)

Replace `project.dataset` and date range as needed.

### 1) Daily milestone counts

```sql
SELECT
  event_date,
  event_name,
  (
    SELECT ep.value.int_value
    FROM UNNEST(event_params) ep
    WHERE ep.key = 'depth_percent'
  ) AS depth_percent,
  COUNT(*) AS event_count
FROM `project.dataset.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260101' AND '20261231'
  AND event_name IN ('home_below_fold_reached', 'home_scroll_depth')
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;
```

### 2) Below-fold reach rate by day

```sql
WITH base AS (
  SELECT
    event_date,
    user_pseudo_id,
    event_name
  FROM `project.dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260101' AND '20261231'
    AND event_name IN ('page_view', 'home_below_fold_reached')
),
home_visits AS (
  SELECT event_date, COUNT(*) AS visits
  FROM base
  WHERE event_name = 'page_view'
  GROUP BY event_date
),
below_fold AS (
  SELECT event_date, COUNT(*) AS below_fold_hits
  FROM base
  WHERE event_name = 'home_below_fold_reached'
  GROUP BY event_date
)
SELECT
  h.event_date,
  h.visits,
  COALESCE(b.below_fold_hits, 0) AS below_fold_hits,
  SAFE_DIVIDE(COALESCE(b.below_fold_hits, 0), h.visits) AS below_fold_rate
FROM home_visits h
LEFT JOIN below_fold b USING (event_date)
ORDER BY h.event_date DESC;
```

## Notes

- Milestones are per page load and deduplicated client-side.
- If no analytics sink is configured, events still dispatch as browser custom
  events (`wrdlnkdn:analytics`) for local QA.

## UX weekly checklist

Use this as a lightweight recurring review during UX/UI audits.

### 1) Adoption sanity check

- Confirm both events are still incoming this week:
  - `home_below_fold_reached`
  - `home_scroll_depth`
- If either event drops to near-zero unexpectedly, verify:
  - homepage still scrolls as expected
  - analytics sink ingestion is healthy

### 2) Core KPI

- Track **below-fold reach rate** weekly.
- Suggested starter guardrail:
  - investigate if it drops by **20%+ week-over-week**

### 3) Depth distribution health

- Compare milestone mix (`25/50/75/100`) week-over-week.
- Suggested starter guardrails:
  - `50%` milestone share drops **15%+** week-over-week
  - `75%` or `100%` milestone share drops **20%+** week-over-week

### 4) Segment checks

- Break out by key contexts where possible:
  - desktop vs mobile viewport
  - UAT vs PROD
  - campaign landing windows (if relevant)
- If one segment regresses while others are stable, prioritize UI/scroll QA
  there first.

### 5) Qualitative follow-up when alerts trigger

- Re-check for nested scroll containers and sticky overlays.
- Confirm hero/video transitions do not trap focus or scroll.
- Verify CTA visibility above fold and after first scroll.
- Pair analytics with a quick session sample (or moderated test) before design
  changes.

### 6) Suggested alert channels

- Weekly dashboard summary to UX + product.
- Immediate alert if:
  - events stop entirely for > 2 hours in PROD
  - below-fold reach rate crosses critical threshold set by your team.
