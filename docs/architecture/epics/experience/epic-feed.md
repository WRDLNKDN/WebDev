<!-- markdownlint-disable MD013 MD060 -->

# Epic: Feed (Content & Activity Surface) #313

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Content Surface  
**Canonical Route:** `/feed`

The Feed is the canonical authenticated content and activity surface. It is a
content-first surface, distinct from Directory (people discovery) and Dashboard
(private control).

---

## 1. Purpose

Enable members to:

- View posts
- React to posts
- See activity updates
- Consume content from connections and public posts (per visibility settings)
- Engage intentionally without algorithmic manipulation

The Feed is optimized for signal-based content, not engagement farming.

---

## 2. Canonical Route & Access

- **Route:** `/feed`
- **Access:** Authenticated (RequireOnboarded → redirects to `/join` if
  signed-out)
- **IA alignment:** See [IA Baseline](./ia-baseline.md). Feed ≠ Directory, Feed
  ≠ Dashboard.

---

## 3. Core Capabilities (Implementation Status)

### 3.1 Post Rendering ✅

- Structured post cards with author attribution, timestamp
- Actor (handle, display_name, avatar) via `feed_items` + `profiles`
- Content kinds: post, external_link, repost, reaction, profile_update

### 3.2 Visibility Logic ✅

- `feed_view_preference`: `anyone` (all approved members) or `connections`
  (self + followees only)
- Stored in `profiles.feed_view_preference`
- Backend RPC `get_feed_page` enforces via `feed_connections` and viewer
  preference
- Feed hidden for signed-out users (route guard)

### 3.3 Reactions ✅

- Like, Love, Inspiration, Care (extensible model)
- `setReaction`, `removeReaction` via `feedsApi.ts`
- Backend: POST/DELETE `/api/feeds` (reaction kind), DELETE
  `/api/feeds/items/:postId/reaction`
- Comments support the same emoji model with deterministic per-emoji counts and
  viewer state.

### 3.4 Post & Comment Ownership Actions ✅

- Members can edit and delete their own posts.
- Members can edit and delete their own comments.
- Edited state persists using `edited_at` and renders as `Edited` in the Feed
  UI.
- No placeholder rows remain after delete.

### 3.5 Activity Stream Integrity ✅

- No blank cards: empty states handled
- Error handling: `handleAuthError`, snackbar feedback
- Cursor-based pagination for stable ordering
- No duplicate emoji reaction entries per member/target

### 3.6 Real-Time Consistency ✅

- Feed and comment updates refresh across active sessions via Supabase realtime
  feed item change subscription.
- Reactions and deletes reflect without requiring a hard page refresh.

### 3.7 Layout Stability ✅

- Responsive structure (Grid, breakpoints)
- Sidebar collapse (Explore, Community, Legal)
- Footer navigation integrity

### 3.8 Feed Endpoint Integration ✅

- `GET /api/feeds` — MVP, deterministic `created_at DESC` ordering
- No engagement-based ranking

---

## 4. Explicit Non-Goals (Verified)

The Feed does **not**:

- Function as a member directory ✅ (Directory at `/directory`)
- Replace `/directory` ✅
- Replace `/dashboard` ✅
- Use algorithmic ranking based on engagement metrics ✅
- Surface follower counts or vanity metrics ✅

---

## 5. Dependencies

- Auth state management (Supabase)
- Post visibility schema (`feed_view_preference`, `feed_connections`, RLS)
- Reaction schema (`feed_items` with `parent_id` for reactions)
- API layer: [Feeds API](../feeds-api.md), [API Layer](./api-layer.md)
- [Canonical IA](./ia-baseline.md)

---

## 6. Acceptance Criteria

| Criterion                                  | Status |
| ------------------------------------------ | ------ |
| `/feed` exists and is authenticated        | ✅     |
| Feed renders posts only (not people list)  | ✅     |
| Feed respects post visibility rules        | ✅     |
| Feed hides for signed-out users            | ✅     |
| No engagement-based ranking exists         | ✅     |
| Layout is responsive and stable            | ✅     |
| Navigation highlights Feed when on `/feed` | ✅     |
| Author can edit/delete own posts/comments  | ✅     |
| `Edited` marker persists on refresh        | ✅     |
| Reactions are deterministic per emoji      | ✅     |

---

## 7. Related Docs

- [Feeds API](../feeds-api.md)
- [IA Baseline](./ia-baseline.md)
- [Epic: Home Dashboard](./epic-home-dashboard.md)
- [Directory](../directory.md) — people discovery (distinct surface)
