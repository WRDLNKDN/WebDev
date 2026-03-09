<!-- markdownlint-disable MD013 MD060 -->

# API Layer Planned Contracts

[← API layer](./api-layer.md)

This document contains planned and target contracts that are not fully
implemented yet.

## Response Envelope (Target Contract)

All new endpoints should use this JSON response envelope:

```jsonc
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {},
}
```

On error:

```jsonc
{
  "ok": false,
  "data": null,
  "error": "Human-readable message",
  "meta": { "code": "RESOURCE_NOT_FOUND" },
}
```

## 1. Auth And Profile APIs

### 1.1 GET `/api/me`

Purpose: Lightweight profile bootstrap for the frontend. Auth: Supabase JWT
(Bearer). Roles: `user`, `creator`, `moderator`, `admin`.

Response:

```jsonc
{
  "ok": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "handle": "nick",
    "displayName": "Nick",
    "roles": ["user"],
    "isAdmin": false,
  },
  "error": null,
  "meta": {},
}
```

## 2. Public Playlist And Content APIs

### 2.1 GET `/api/public/playlists`

Purpose: List public playlists and metadata. Auth: None. Query: `limit`,
`offset`.

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "slug": "wrdlnkdn-weekly",
      "title": "WRDLNKDN Weekly",
      "description": "Curated community picks.",
      "thumbnailUrl": "https://img.youtube.com/...",
      "itemCount": 42,
      "updatedAt": "2026-02-02T12:00:00Z",
    },
  ],
  "error": null,
  "meta": { "total": 1, "limit": 20, "offset": 0 },
}
```

### 2.2 GET `/api/public/playlists/:slug/items`

Purpose: Retrieve published items for a playlist. Auth: None.

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "title": "Talk: Building the Human OS",
      "submittedBy": { "handle": "nick", "displayName": "Nick" },
      "type": "youtube",
      "youtubeUrl": "https://youtu.be/...",
      "publishedAt": "2026-02-01T20:00:00Z",
      "durationSeconds": 1800,
    },
  ],
  "error": null,
  "meta": { "total": 42, "limit": 20, "offset": 0 },
}
```

## 3. Content Submission APIs

### 3.1 POST `/api/content/submissions`

Purpose: Create a submission for the current user. Auth: Supabase JWT. Roles:
`user`, `creator`.

Request:

```jsonc
{
  "title": "string",
  "description": "string",
  "type": "youtube",
  "youtubeUrl": "https://youtu.be/...",
  "tags": ["infra", "talk"],
  "notesForModerators": "string",
}
```

Response:

```jsonc
{
  "ok": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "createdAt": "2026-02-02T12:00:00Z",
  },
  "error": null,
  "meta": {},
}
```

### 3.2 POST `/api/content/uploads/url`

Purpose: Get a one-time upload URL. Auth: Supabase JWT.

```jsonc
{
  "ok": true,
  "data": {
    "uploadUrl": "https://storage.../signed",
    "storagePath": "submissions/{userId}/{uuid}.mp4",
  },
  "error": null,
  "meta": { "expiresInSeconds": 900 },
}
```

## 4. Moderation And Publishing APIs

### 4.1 GET `/api/admin/content/submissions`

Purpose: List submissions for moderation. Auth: `requireAdmin`. Query: `status`,
`q`, `limit`, `offset`, `sort`, `order`.

### 4.2 POST `/api/admin/content/:id/approve`

Purpose: Approve a submission. Body: `{ "notes": "Looks good." }`

### 4.3 POST `/api/admin/content/:id/reject`

Purpose: Reject a submission. Body:
`{ "reason": "Content does not match community guidelines." }`

### 4.4 POST `/api/admin/content/:id/request-changes`

Purpose: Request edits from creator.

### 4.5 POST `/api/admin/content/:id/publish`

Purpose: Publish approved content to playlist. Body:
`{ "playlistId": "uuid", "publishAt": "2026-02-03T18:00:00Z" }`

## 5. Admin Management APIs

### 5.1 GET `/api/admin/audit`

Purpose: View audit log entries for privileged operations. Auth: `requireAdmin`.

## Implementation Notes

- Auth: `Authorization: Bearer <token>` for authenticated routes.
- Planned RLS: `content_submissions`, `playlists`, `playlist_items`,
  `audit_log`.
- Admin routes use `adminSupabase` service role.
- Moderation and publishing actions should be audit-logged.
