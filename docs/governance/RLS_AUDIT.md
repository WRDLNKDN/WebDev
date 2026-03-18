# RLS and Schema Audit Summary

**Epic:** API & Data Layer Governance  
**Date:** 2026-02-19  
**Scope:** profiles, feed_items (posts/comments/reactions), chat, directory,
content, events, community partners

---

## Lookup / feed performance indexes (DDL in `20260121180000_tables.sql`)

| Index                                      | Purpose                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `idx_feed_items_root_timeline`             | `get_feed_page` “anyone” stream: root rows, sort key `coalesce(scheduled_at, created_at), id` |
| `idx_feed_items_user_root_timeline`        | Connections feed: same ordering scoped by `user_id`                                           |
| `idx_feed_items_reaction_parent_user_kind` | Correlated “viewer’s reaction” lookup on parent posts                                         |
| `idx_saved_feed_items_feed_item_id`        | `EXISTS` for saved bookmark on each feed row                                                  |
| `idx_chat_room_members_room_active`        | Active members per room (`left_at is null`)                                                   |
| `idx_weirdlings_user_id_active`            | Feed join to active Weirdling avatar                                                          |

---

## Table-by-Table RLS Status

| Table                      | RLS Enabled | Policies                                                             | Notes                                                                        |
| -------------------------- | ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `admin_allowlist`          | ✅          | `admin_allowlist_admin_all` — admin CRUD                             | No anon/authenticated table grant; RLS + is_admin()                          |
| `profiles`                 | ✅          | 4 select (public approved, own, admin), insert own, update own/admin | Status changes blocked by trigger                                            |
| `portfolio_items`          | ✅          | Own CRUD + public read for approved profiles                         |                                                                              |
| `generation_jobs`          | ✅          | Own CRUD                                                             |                                                                              |
| `weirdlings`               | ✅          | Own CRUD                                                             |                                                                              |
| `feed_connections`         | ✅          | One SELECT (user_id or connected_user_id), insert/delete as owner    | Single permissive SELECT for performance                                     |
| `connection_requests`      | ✅          | Requester CRUD, recipient select/update                              |                                                                              |
| `feed_items`               | ✅          | Select from self or followees, insert own, delete own                | **Gap:** No update policy (posts are immutable; comments/reactions = insert) |
| `feed_advertisers`         | ✅          | Public read active, admin all                                        | Anon has no select; authenticated can select                                 |
| `community_partners`       | ✅          | Public read active, admin all                                        | Decoupled from ad inventory; anon + authenticated select                     |
| `chat_rooms`               | ✅          | Members read, authenticated insert, admins update                    |                                                                              |
| `chat_room_members`        | ✅          | Members read, admins insert/update, users leave                      |                                                                              |
| `chat_blocks`              | ✅          | Own CRUD                                                             |                                                                              |
| `chat_suspensions`         | ✅          | Moderators all, users read own                                       |                                                                              |
| `chat_messages`            | ✅          | Members read/insert, senders update own, admins update (moderation)  |                                                                              |
| `chat_message_reactions`   | ✅          | Members manage in rooms                                              |                                                                              |
| `chat_message_attachments` | ✅          | Members read, insert for own messages                                |                                                                              |
| `chat_read_receipts`       | ✅          | Members manage in rooms                                              |                                                                              |
| `chat_reports`             | ✅          | Users insert, admins read/update                                     |                                                                              |
| `chat_audit_log`           | ✅          | Admins read only                                                     | No insert policy — inserts via triggers only                                 |
| `chat_moderators`          | ✅          | Admins all                                                           |                                                                              |
| `content_submissions`      | ✅          | Own insert/select, admin all                                         |                                                                              |
| `playlists`                | ✅          | Public read public, authenticated read all, admin all                |                                                                              |
| `playlist_items`           | ✅          | Same                                                                 |                                                                              |
| `audit_log`                | ✅          | Admins select only                                                   | Insert via app/service_role                                                  |

---

## Tables Without RLS

- **None.** All user-facing tables have RLS enabled.

---

## Potential Risks

### 1. `feed_items` — "Users can read from self or followees"

- Policy allows reading feed items where `auth.uid() = feed_items.user_id` OR
  user follows the author.
- `get_feed_page` is SECURITY DEFINER and filters by `p.status = 'approved'` and
  feed view preference. RLS still applies to direct table access.
- **Risk:** Low. Feed is consumed via `get_feed_page()` which is well-scoped.

### 2. `profiles` — `profiles_public_read_approved`

- Any role (including anon) can SELECT rows where `status = 'approved'`.
- **Risk:** Low. Approved profiles are intended to be directory-visible.

### 3. `feed_advertisers` — `feed_advertisers_public_read`

- Policy: `using (active = true)` — any authenticated user can read active ads.
- **Risk:** Low. Ads are public by design.

### 4. `chat_audit_log` — No insert policy for authenticated

- Inserts happen via triggers (chat_audit_on_message). Triggers run as definer.
- **Risk:** Low. No user-initiated insert.

### 5. `community_partners` — `community_partners_public_read`

- Policy: `using (active = true)` — anon/authenticated can read active records.
- **Risk:** Low. Public partner listings are intended to be publicly visible.

### 6. Storage buckets

- All buckets have explicit policies. No anon insert on sensitive buckets.
- **Risk:** Low.

---

## Remediation Items

1. **Optional:** Add `profiles_feed_view_preference` — restrict feed items read
   to respect `feed_view_preference` when using direct table access. Currently
   handled by `get_feed_page`.
2. **Optional:** Document that `get_feed_page` and `get_directory_page` bypass
   RLS (security definer) but enforce equivalent logic.
3. **Optional:** Add dedicated storage bucket/policies for community partner
   media if partner assets should be isolated from ad assets operationally.

---

## UAT vs PROD Parity Checklist

- [ ] Run `\d+` and policy list on both environments.
- [ ] Compare `auth.config` (providers, redirect URLs).
- [ ] Compare env vars: `VITE_SUPABASE_URL`, `SUPABASE_URL`, etc.
