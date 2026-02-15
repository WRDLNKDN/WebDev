# Directory API

Member discovery surface for WRDLNKDN. Authenticated members can search, filter,
and browse other members; manage connection requests; and open chats with
connections. **Not** a resume database or popularity engine—privacy and
connection-aware visibility are enforced server-side.

## Overview

- **Auth:** Required for all Directory endpoints. No public Directory access.
- **Privacy:** Members choose `members_only` (visible to all signed-in members)
  or `connections_only` (visible only to mutual connections). Enforced via
  Supabase RLS and `get_directory_page` RPC.
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
- **409** — request already exists.

### POST /api/directory/accept

Accept a pending connection request (recipient only). Body:
`{ "targetId": "uuid" }`.

Creates mutual `feed_connections` and marks the request accepted.

### POST /api/directory/decline

Decline a pending connection request. Body: `{ "targetId": "uuid" }`.

### POST /api/directory/disconnect

Remove mutual connection. Body: `{ "targetId": "uuid" }`.

Deletes both `feed_connections` rows. Confirmation recommended in UI.

## Connection flow

1. **Not connected** → User A clicks Connect → `connection_requests` row created
   (pending).
2. **Pending** (A's view) / **Pending received** (B's view) → B can Accept or
   Decline. Accept creates mutual `feed_connections`.
3. **Connected** → Either can open Chat or Disconnect.

## Frontend

- **API client:** `src/lib/directoryApi.ts` — `fetchDirectory`,
  `connectRequest`, `acceptRequest`, `declineRequest`, `disconnect`.
- **Page:** `src/pages/Directory.tsx` — list view, search, filters
  (URL-persisted), sort, pagination, connection actions.
- **Row:** `src/components/directory/DirectoryRow.tsx` — displays member and
  actions per connection state.

## Database

- **Tables:** `connection_requests`, `profiles` (columns: industry, location,
  profile_visibility, last_active_at).
- **RPC:** `get_directory_page` — search, filter, connection state, privacy.
- **Migrations:** `supabase/migrations/20260121180000_tables.sql`,
  `20260121180005_rls.sql`.
