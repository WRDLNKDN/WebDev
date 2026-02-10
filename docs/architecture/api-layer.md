# API Layer: WRDLNKDN Frontend ⇄ Backend

> Version: v1 (draft, implementation-ready)

This document defines the API contracts between the **frontend (Vercel)** and
the **backend (Supabase + Node/Express)**. It is the source of truth for
frontend–backend integration and for RLS / role configuration in Supabase.

All endpoints use a **JSON response envelope**:

```jsonc
{
  "ok": true, // boolean
  "data": {}, // resource payload or list
  "error": null, // string or null
  "meta": {}, // optional pagination / debug info
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

The existing profile admin APIs keep their current shape; new endpoints should
follow this envelope.

---

## 1. Auth & Profile APIs

### 1.1 `GET /api/me`

**Purpose:** Lightweight profile bootstrap for the frontend.  
**Auth:** Supabase JWT (Bearer).  
**Roles:** `user`, `creator`, `moderator`, `admin`.

#### 1.1 Response

```jsonc
{
  "ok": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "handle": "nick",
    "displayName": "Nick",
    "roles": ["user"], // derived from claims / allowlists
    "isAdmin": false,
  },
  "error": null,
  "meta": {},
}
```

---

## 2. Public Playlist & Content APIs

All public content is **approved + published** and safe for unauthenticated
consumption. These endpoints are consumable from the frontend or from static
pages.

### 2.1 `GET /api/public/playlists`

**Purpose:** List public playlists and high-level metadata.  
**Auth:** None.  
**Roles:** public.

#### 2.1 Query

- `limit` (optional, default 20, max 100)
- `offset` (optional, default 0)

#### 2.1 Response

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "slug": "wrdlnkdn-weekly",
      "title": "WRDLNKDN Weekly",
      "description": "Curated community picks.",
      "thumbnailUrl": "https://img.youtube.com/…",
      "itemCount": 42,
      "updatedAt": "2026-02-02T12:00:00Z",
    },
  ],
  "error": null,
  "meta": { "total": 1, "limit": 20, "offset": 0 },
}
```

### 2.2 `GET /api/public/playlists/:slug/items`

**Purpose:** Retrieve published items for a playlist for public viewing.  
**Auth:** None.  
**Roles:** public.

#### 2.2 Response

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "title": "Talk: Building the Human OS",
      "submittedBy": {
        "handle": "nick",
        "displayName": "Nick",
      },
      "type": "youtube", // "youtube" | "upload"
      "youtubeUrl": "https://youtu.be/…",
      "publishedAt": "2026-02-01T20:00:00Z",
      "durationSeconds": 1800,
    },
  ],
  "error": null,
  "meta": { "total": 42, "limit": 20, "offset": 0 },
}
```

---

## 3. Content Submission APIs

These are used by authenticated community members to submit content.  
Supabase RLS ensures users can only see and modify their own submissions.

### 3.1 `POST /api/content/submissions`

**Purpose:** Create a new submission as the current user.  
**Auth:** Supabase JWT (Bearer).  
**Roles:** `user`, `creator`.

#### 3.1 Request body

```jsonc
{
  "title": "string",
  "description": "string",
  "type": "youtube", // "youtube" | "upload"
  "youtubeUrl": "https://youtu.be/…", // required if type="youtube"
  "tags": ["infra", "talk"], // optional
  "notesForModerators": "string", // optional
}
```

#### 3.1 Response

```jsonc
{
  "ok": true,
  "data": {
    "id": "uuid",
    "status": "pending", // pending | approved | rejected | changes_requested
    "createdAt": "2026-02-02T12:00:00Z",
  },
  "error": null,
  "meta": {},
}
```

### 3.2 `POST /api/content/uploads/url`

**Purpose:** Obtain a one-time upload URL for raw video submission.  
**Auth:** Supabase JWT.  
**Roles:** `user`, `creator`.  
**Backend:** Uses Supabase Storage via service role.

#### 3.2 Request body

```jsonc
{
  "filename": "talk.mp4",
  "contentType": "video/mp4",
}
```

#### 3.2 Response

```jsonc
{
  "ok": true,
  "data": {
    "uploadUrl": "https://storage.…/signed",
    "storagePath": "submissions/{userId}/{uuid}.mp4",
  },
  "error": null,
  "meta": { "expiresInSeconds": 900 },
}
```

The frontend uploads directly to `uploadUrl` and then calls
`POST /api/content/submissions` with `type: "upload"` and the `storagePath`.

---

## 4. Moderation & Publishing APIs (Admin)

All moderation endpoints require admin/creator‑ops roles and are enforced via
`requireAdmin` middleware + RLS on Supabase tables. All actions are logged to an
`audit_log` table.

### 4.1 `GET /api/admin/content/submissions`

**Purpose:** List submissions for moderation.  
**Auth:** `requireAdmin`.  
**Query params:** `status`, `q`, `limit`, `offset`, `sort`, `order`.

#### 4.1 Response

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "submittedBy": {
        "id": "uuid",
        "handle": "nick",
        "displayName": "Nick",
      },
      "type": "youtube",
      "status": "pending",
      "submittedAt": "2026-02-02T12:00:00Z",
    },
  ],
  "error": null,
  "meta": { "total": 12, "limit": 25, "offset": 0 },
}
```

### 4.2 `POST /api/admin/content/:id/approve`

**Purpose:** Approve a submission and make it eligible for publishing.  
**Auth:** `requireAdmin`.  
**Body:**

```jsonc
{
  "notes": "Looks good. Scheduling for next playlist.",
}
```

### 4.3 `POST /api/admin/content/:id/reject`

**Purpose:** Reject a submission.  
**Auth:** `requireAdmin`.  
**Body:**

```jsonc
{
  "reason": "Content does not match community guidelines.",
}
```

### 4.4 `POST /api/admin/content/:id/request-changes`

**Purpose:** Request edits from the creator (non‑blocking, optional).  
**Auth:** `requireAdmin`.

### 4.5 `POST /api/admin/content/:id/publish`

**Purpose:** Publish an approved submission into a playlist.  
**Auth:** `requireAdmin`.  
**Body:**

```jsonc
{
  "playlistId": "uuid",
  "publishAt": "2026-02-03T18:00:00Z",
}
```

Backend uses a service‑role Supabase client to:

1. Insert a row into `playlist_items`.
2. Optionally queue YouTube API work (out of scope here).
3. Insert `audit_log` entry with who did what and when.

---

## 5. Admin Management APIs

### 5.1 `GET /api/admin/audit`

**Purpose:** View audit log entries for privileged operations.  
**Auth:** `requireAdmin`.

#### 5.1 Response

```jsonc
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "actorEmail": "admin@example.com",
      "action": "CONTENT_APPROVED",
      "targetType": "content_submission",
      "targetId": "uuid",
      "meta": { "statusFrom": "pending", "statusTo": "approved" },
      "createdAt": "2026-02-02T13:00:00Z",
    },
  ],
  "error": null,
  "meta": { "total": 120, "limit": 50, "offset": 0 },
}
```

---

## 6. Implementation Notes

- **Auth:** All authenticated endpoints expect a Supabase JWT via
  `Authorization: Bearer <token>`.
- **RLS:** Tables `content_submissions`, `playlists`, `playlist_items`,
  `audit_log` must have RLS policies matching the above contracts.
- **Service role:** All `/api/admin/*` routes use the existing `adminSupabase`
  client (service role key) in `backend/server.ts`.
- **Observability:** Admin routes record events in `audit_log` with:
  `actor_email`, `action`, `target_type`, `target_id`, and a `meta` JSONB
  payload.

This file is the contract; backend route handlers and frontend API clients
(`adminApi.ts` and new `contentApi.ts`) should be implemented to match this
shape.
