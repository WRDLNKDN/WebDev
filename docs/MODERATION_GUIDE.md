# Moderation Guide: Content & Chat Reports

Profile moderation has been removed — all users are auto-approved on signup.
This guide covers the remaining moderation systems.

---

## Content Moderation

**Purpose:** Review community-submitted videos (YouTube or uploads) before they
appear in public playlists.

**Flow:**

1. **Submit** — Users submit content at `/dashboard` (Content Submission)
2. **Pending** — Submission appears in Admin → Content Moderation with status
   `pending`
3. **Review** — Admin can:
   - **Approve** — Move to `approved`
   - **Reject** — Move to `rejected` (optionally with a reason)
   - **Request Changes** — Move to `changes_requested` (user can resubmit)
4. **Publish** — Approved content can be **Published** to a playlist (e.g.
   `wrdlnkdn-weekly`)
5. **Public** — Published items appear in
   `GET /api/public/playlists/:slug/items` and the YouTube playlist UI

**Status lifecycle:**

```text
pending → approved / rejected / changes_requested
approved → published (to playlist)
```

**Where:** Admin → Content Moderation (`/admin/content`)

**APIs:**

- `GET /api/admin/content/submissions` — List submissions (filter by status)
- `POST /api/admin/content/:id/approve`
- `POST /api/admin/content/:id/reject`
- `POST /api/admin/content/:id/request-changes`
- `POST /api/admin/content/:id/publish` — Add to playlist

---

## Chat Reports

**Purpose:** Let users report offensive messages or conduct. Admins triage and
can suspend users from chat.

**Flow:**

1. **Report** — User right-clicks a message (or reports a user) → `ReportDialog`
   opens
2. **Submit** — User picks a category (Harassment, Spam, Inappropriate Content,
   Other) and optional details
3. **Stored** — `chat_reports` table: reporter, reported message/user, category,
   status
4. **Admin** — Admin → Chat Reports (`/admin/chat-reports`) lists reports
5. **Triage** — Admin can update status: `open` → `under_review` → `resolved`
6. **Suspend** — Admin can suspend a user from chat via `chat_suspensions`
   (blocks them from rooms)

**Report categories:**

- `harassment`
- `spam`
- `inappropriate_content`
- `other`

**Status lifecycle:**

```text
open → under_review → resolved
```

**Where:** Admin → Chat Reports (`/admin/chat-reports`)

**Optional:** Configure a [Database Webhook](docs/chat/REPORT_EMAIL_SETUP.md) on
`chat_reports` INSERT to notify moderators via email.

---

## Summary

- **Profile:** ~~Signups~~ — Removed; all users auto-approved.
- **Content:** Video submissions — `/admin/content` — Approve, publish.
- **Chat Reports:** Messages/conduct — `/admin/chat-reports` — Resolve/suspend.
