# Directory API

[← Docs index](./README.md)

Member discovery surface for WRDLNKDN. Authenticated members can search, filter,
and browse other members; manage connection requests; and open chats with
connections. **Not** a resume database or popularity engine—privacy and
connection-aware visibility are enforced server-side.

## Overview

- **Auth:** Required for all Directory endpoints. No public Directory access.
- **Privacy:** Members choose `members_only` (visible to all signed-in members)
  or `connections_only` (visible only to mutual connections). Enforced via
  Supabase RLS and `get_directory_page` RPC.
- **Who appears:** Only profiles with `status = 'approved'` are listed. If a
  member does not appear, they may have
  `profile_visibility = 'connections_only'` and no connection with the viewer.
- **Rate limiting:** List (GET) 100/min, actions 30/min per user. 429 responses
  include `retryAfter` (seconds).

## Endpoints

### GET /api/directory

Paginated member listing with search, filters, and sort.

#### Query parameters

| Param               | Type   | Default | Description          |
| ------------------- | ------ | ------- | -------------------- |
| `q`                 | string | —       | Search name, tagline |
| `industry`          | string | —       | Filter industry      |
| `location`          | string | —       | Filter location      |
| `skills`            | string | —       | Comma AND filter     |
| `connection_status` | string | —       | connection state     |
| `sort`              | string | recent  | recently_active, etc |
| `offset`            | number | 0       | Pagination offset    |
| `limit`             | number | 25      | Page size 1–50       |

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "handle": "string | null",
      "display_name": "string | null",
      "avatar": "string | null",
      "tagline": "string | null",
      "pronouns": "string | null",
      "industry": "string | null",
      "location": "string | null",
      "skills": ["string"],
      "bio_snippet": "string | null",
      "connection_state": "not_connected | pending | pending_received | connected",
      "use_weirdling_avatar": false
    }
  ],
  "hasMore": boolean
}
```

**429:** `{ "error": "message", "retryAfter": number }` — wait `retryAfter`
seconds before retrying.

### POST /api/directory/connect

Send a connection request. Body: `{ "targetId": "uuid" }`.

- **201** — request created.
- **200** — reverse pending request auto-accepted; mutual connection created.
- **409** — request already exists.

### POST /api/directory/accept

Accept a pending connection request (recipient only). Body:
`{ "targetId": "uuid" }`.

Creates mutual `feed_connections`, marks the request accepted, and sends an
in-app notification to the original requester.

### POST /api/directory/decline

Decline a pending connection request. Body: `{ "targetId": "uuid" }`.

Marks the request declined and sends an in-app notification to the original
requester.

### POST /api/directory/cancel

Cancel a connection request that you sent (requester only). Body:
`{ "targetId": "uuid" }`.

Deletes the pending request. The recipient no longer sees the request; the
sender’s card returns to the default non-connected state. **404** if no pending
request from you to that target exists.

### POST /api/directory/disconnect

Remove mutual connection. Body: `{ "targetId": "uuid" }`.

Deletes both `feed_connections` rows. Confirmation recommended in UI.

## Connection flow

1. **Not connected** → User A clicks Connect → `connection_requests` row created
   (pending).
2. **Pending** (A's view: "Pending approval") / **Pending received** (B's view:
   "Needs your approval") → A can Cancel request; B can Accept or Decline.
3. **Auto-accept path:** If B already sent A a pending request, A clicking
   Connect auto-accepts the relationship immediately.
4. **Connected** → Either can open Chat or use Manage (Disconnect or Block).
   Block adds the member to `chat_blocks`, removes the connection if present,
   and excludes them from Directory results for the blocker.

## Frontend

- **API client:** `src/lib/directoryApi.ts` — `fetchDirectory`,
  `connectRequest`, `acceptRequest`, `declineRequest`, `cancelRequest`,
  `disconnect`.
- **Page:** `src/pages/community/Directory.tsx` — list view, search, filters
  (URL-persisted), sort, pagination, connection actions.
- **Row:** `src/components/directory/DirectoryRow.tsx` — displays member and
  actions per connection state (Connect, Accept/Decline, or Chat + Manage with
  Disconnect/Block for connected).

## Database

- **Tables:** `connection_requests`, `profiles` (columns: industry,
  secondary_industry, industries, location, profile_visibility, last_active_at).
  - `industries` (jsonb): repeatable industry groups; each entry has `industry`
    and `sub_industries[]`. Used for Directory filtering (match any group) and
    Edit Profile (up to 5 groups, 8 sub-industries per group). Legacy `industry`
    / `secondary_industry` are kept in sync from the first group.
- **RPC:** `get_directory_page` — search, filter (including multi-industry match
  via `industries`), connection state, privacy.
- **Migrations:**
  [`supabase/migrations/20260121180000_tables.sql`](../supabase/migrations/20260121180000_tables.sql),
  [`20260121180005_rls.sql`](../supabase/migrations/20260121180005_rls.sql).
  After adding the `industries` column (and backfill from `industry` /
  `secondary_industry`), run your usual migration path (e.g. `supabase db push`
  or apply the tables migration then RLS) so Edit Profile and Directory filter
  use the new shape.

## See also

- [Docs index](./README.md)
- [API Layer](./architecture/api-layer.md)
- [Feeds API](./feeds-api.md)
- [Supabase README](../supabase/README.md)
