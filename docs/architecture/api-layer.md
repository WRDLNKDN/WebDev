<!-- markdownlint-disable MD013 MD060 -->

# API Layer: WRDLNKDN Frontend ⇄ Backend

[← Docs index](../README.md)

> Version: v1 (draft, implementation-ready)

This document defines the API contracts between the **frontend (Vercel)** and
the **backend (Supabase + Node/Express)**. It is the source of truth for
frontend–backend integration and for RLS / role configuration in Supabase.

---

## Implemented APIs (MVP)

The following APIs are **implemented and deployed**:

| Surface              | Endpoints                                                                       | Auth                       | Doc                             |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| **Feeds**            | GET/POST `/api/feeds`, reactions, comments                                      | Bearer JWT                 | [feeds-api.md](../feeds-api.md) |
| **Directory**        | GET `/api/directory`, connect/accept/decline/disconnect                         | Bearer JWT                 | [directory.md](../directory.md) |
| **Admin profiles**   | GET/POST profiles (approve, reject, disable, delete)                            | Bearer JWT / x-admin-token | backend README                  |
| **Weirdling**        | generate, regenerate, save, me, delete                                          | Bearer JWT                 | weirdling architecture          |
| **Auth/me**          | GET `/api/me` — lightweight profile bootstrap                                   | Bearer JWT                 | § 1.1 below                     |
| **Content**          | POST `/api/content/submissions`, POST `/api/content/uploads/url`                | Bearer JWT                 | § 3 below                       |
| **Public playlists** | GET `/api/public/playlists`, GET `/api/public/playlists/:slug/items`            | None                       | § 2 below                       |
| **Admin content**    | GET `/api/admin/content/submissions`, approve, reject, request-changes, publish | requireAdmin               | § 4 below                       |
| **Admin playlists**  | GET/POST `/api/admin/playlists`                                                 | requireAdmin               | —                               |
| **Audit**            | GET `/api/admin/audit`                                                          | requireAdmin               | § 5 below                       |

**Auth:** All authenticated endpoints expect `Authorization: Bearer <token>`
(Supabase JWT). RLS and `requireAuth`/`requireAdmin` enforce privileges.

**Response envelope:** Feeds and Directory use `{ data, nextCursor? }` /
`{ error }`; admin APIs use a similar JSON shape. See Response Envelope below.

---

## Response Envelope (Target Contract)

All new endpoints should use this **JSON response envelope**:

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

---

## Planned APIs (Future / Community Content)

The following sections describe **planned** contracts for community-driven video
submissions, playlists, and moderation. They are not yet implemented.

### 1. Auth & Profile APIs

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

### 2. Public Playlist & Content APIs

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

### 3. Content Submission APIs

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

### 4. Moderation & Publishing APIs (Admin)

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

### 5. Admin Management APIs

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

## Implementation Notes

- **Auth:** All authenticated endpoints expect a Supabase JWT via
  `Authorization: Bearer <token>`.
- **RLS:** Implemented APIs use RLS on `feed_items`, `feed_connections`,
  `profiles`, `portfolio_items`, etc. Planned APIs will require RLS on
  `content_submissions`, `playlists`, `playlist_items`, `audit_log`.
- **Service role:** Admin routes use `adminSupabase` (service role key).
- **Observability:** Admin profile actions are logged; planned content
  moderation will use `audit_log`.

**Definition of done (Epic #137):** Core API endpoints implemented and deployed;
frontend integrated; no production secrets exposed; decisions documented.
