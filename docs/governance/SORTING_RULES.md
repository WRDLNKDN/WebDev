# Deterministic Sorting Rules

**Epic:** API & Data Layer Governance  
**Date:** 2026-02-14

---

## Feed

**Function:** `get_feed_page`  
**ORDER BY:** `coalesce(scheduled_at, created_at) desc, id desc`  
**Limit:** `least(p_limit, 51)`  
**Notes:** No implicit default; cursor-based pagination. No engagement-based
ranking.

---

## Directory

**Function:** `get_directory_page`  
**Sort options:** `recently_active` (default), `alphabetical`, `newest`  
**ORDER BY:** Explicit CASE for each sort:

- `recently_active`:
  `coalesce(last_active_at, created_at) desc nulls last, id desc`
- `alphabetical`: `coalesce(display_name, handle) asc nulls last, id asc`
- `newest`: `created_at desc nulls last, id desc`  
  **Limit:** `least(p_limit, 51)`

---

## Comments (Feed)

**Table:** `feed_items`  
**Filter:** `kind = 'reaction', payload->>'type' = 'comment'`  
**ORDER BY:** `created_at asc`  
**Notes:** Chronological only.

---

## Playlists / Content

**Playlists:** `order('updated_at', { ascending: false })`  
**Playlist items:**
`order('sort_order'), order('published_at', { ascending: false })`  
**Content submissions:** `order(sort, { ascending: order === 'asc' })`
