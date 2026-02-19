# MVP Chat System Specification

[← Docs index](../README.md)

**Status:** Draft  
**Stack:** Supabase (Postgres, Realtime, Storage, Auth) + WRDLNKDN

Launch in-app chat for authenticated WRDLNKDN users using Supabase.

1:1 messaging is Connections-only. Anyone can create private invite-only group
chats (max 100 members) with admin-controlled governance.

---

## Features

- Unlimited edit
- Unlimited delete (generic placeholder)
- Emoji reactions
- Read receipts (1:1 only)
- Typing indicators
- Online presence (green indicator only)
- 6MB attachments (strict allowlist)
- GIFs
- Reporting (message + user)
- Role-based moderation
- Messages retained indefinitely
- Deleted accounts anonymized
- Suspended users lose access immediately
- Global rate limit: 30 messages per minute
- No email notifications (except report submission to moderators)
- No search

---

## 1. Identity & Authentication

- **Supabase Auth** — WRDLNKDN user signs in via existing OAuth
  (Google/Microsoft)
- **User UUID** (`auth.users.id`) is canonical identity
- Multi-device sessions allowed
- Standard logout only (no logout-everywhere)

## 2. 1:1 Messaging Model

- Only **Connections** (`feed_connections`) may initiate 1:1 chats
- Removing a connection disables future messaging
- Block immediately disables contact both directions
- Read receipts enabled (1:1 only)
- Typing indicators enabled
- Online presence indicator (green only)

## 3. Group Chat Model

- Any authenticated user may create a group
- Groups are private and invite-only
- Max 100 members per group
- Creator becomes admin
- Admin-only permissions: Invite members, Rename group, Remove members, Transfer
  admin role
- Leaving a group is silent
- Removing a member shows: "User was removed from the group"
- Suspension shows: "User is no longer available"

## 4. Admin Continuity Rules

- If admin is suspended: Admin transfers to oldest remaining member; system
  message shown
- When suspension ends: Admin reverts to original admin; system message shown
- Changes made during temporary admin period remain valid

## 5. Messaging Capabilities

- Unlimited message editing; "Edited" indicator shown
- Unlimited delete for everyone; placeholder: "Message deleted"
- Emoji reactions enabled; reaction toggle supported
- No attribution on delete placeholder

## 6. Attachments & Media

- Max 6MB per file
- Max 5 attachments per message
- **Allowed:** jpg, jpeg, png, webp, pdf, doc, docx, txt
- **Disallowed:** Archives (zip, rar, 7z), executables and scripts
- Server-side MIME validation required
- EXIF metadata stripped from images
- Supabase Storage for media
- No malware scanning in MVP (Phase 2)

## 7. Retention & Lifecycle

- Messages retained indefinitely
- Account deletion: Chat access revoked immediately; messages anonymized as
  "Deleted user"; avatar and profile link removed; UUID retained internally for
  audit
- Suspension: Immediate loss of chat access; system message emitted in groups

## 8. Reporting & Moderation

- Users may report: Individual messages, entire users
- Required category + optional free-text
- Categories: Harassment, Spam, Inappropriate Content, Other
- Reports stored in database
- Email notification sent to moderators
- Report statuses: Open, Under Review, Resolved
- **Chat Moderator:** Delete messages, Suspend user from chat only
- **Platform Admin:** Delete messages, Suspend user from chat/platform
- Reporter identity visible to moderators only
- Malicious reporting handled via warning (manual)

## 9. Anti-Abuse Controls

- Global rate limit: 30 messages per minute per user
- 100-member group cap

## 10. Notifications

- In-app only
- No email for normal chat activity
- Email for report submission to moderators only
- No push notifications

## 11. Infrastructure & Operational Posture

- **Supabase Postgres** — chat tables in existing project (or dedicated schema)
- **Supabase Storage** — media attachments
- **Supabase Realtime** — presence, typing, read receipts
- Daily full + hourly incremental backups (Supabase)
- 90-day audit log retention
- Monitoring and alerting for: Postgres health, Storage growth, Backup failures,
  Error rate spikes

## 12. Out of Scope (Phase 2+)

- Federation
- Malware scanning
- Chat search
- Email notifications for messages
- Logout everywhere
- Public groups
- Chat export
- Advanced moderation workflow
- Time-based retention

---

## System Flow (Reference)

```text
[User / Client]
│
└─ Web or Mobile Client
│
└─ Authentication
├─ Supabase Auth (OAuth: Google/Microsoft)
├─ User UUID (auth.users.id) canonical
└─ Multi-device sessions allowed
│
└─ Chat Interfaces
│
├─ 1:1 Messaging
│ ├─ Only Connections may initiate
│ ├─ Block disables both directions
│ ├─ Read receipts enabled
│ ├─ Typing indicator
│ └─ Online presence (green only)
│
├─ Group Chats
│ ├─ Authenticated users may create groups
│ ├─ Invite-only, max 100 members
│ ├─ Creator = admin
│ ├─ Admin permissions: Invite, Rename, Remove, Transfer
│ └─ Leaving/removal messages displayed
│
├─ Message Features
│ ├─ Unlimited edit (1:1 & group)
│ ├─ Unlimited delete (placeholder)
│ ├─ Emoji reactions
│ ├─ Reporting (message + user)
│ ├─ Max 6MB attachments, allowed file types enforced
│ └─ GIF support
│
├─ Role-Based Moderation
│ ├─ Report workflow: Open → Under Review → Resolved
│ ├─ Reporter identity hidden
│ └─ Malicious reporting handled manually
│
├─ Retention & Lifecycle
│ ├─ Messages retained indefinitely
│ ├─ Account deletion → messages anonymized
│ └─ Suspension → immediate access loss
```

---

## Work Item Order

| #   | Title                            | Status |
| --- | -------------------------------- | ------ |
| 228 | Supabase Chat Schema & RLS       | Done   |
| 229 | Core Messaging (1:1, Group)      | Done   |
| 230 | Edit, Delete, Reactions          | Done   |
| 231 | Attachments (6MB, EXIF, Storage) | Done   |
| 232 | Presence, Typing, Receipts       | Done   |
| 234 | NFR: Storage & Backup            | Done   |
| 236 | Reporting & Moderation           | Done   |
| 237 | NFR: Audit Logging               | Done   |
| 238 | NFR: Monitoring                  | Done   |
