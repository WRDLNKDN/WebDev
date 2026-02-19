<!-- markdownlint-disable MD013 MD060 -->

# Epic: Notifications (In-App Activity Signals)

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Notifications  
**Canonical Route:** `/dashboard/notifications`

Notifications surface member-relevant activity without engagement farming.
Intentional, contextual, non-manipulative, non-addictive.

---

## 1. Purpose

Enable members to stay aware of:

- Reactions to their posts
- Comments on their posts
- Mentions (@handle)
- Chat messages
- Connection requests
- Event RSVPs (when someone RSVPs to their event)

Notifications provide signal, not dopamine loops.

---

## 2. Canonical Route & Access

- **Route:** `/dashboard/notifications`
- **Access:** Authenticated (RequireOnboarded → redirects to `/join` if
  signed-out)
- **IA alignment:** See [IA Baseline](./ia-baseline.md). Notifications is a
  private control surface, distinct from Feed and Events.

---

## 3. Core Capabilities (Implementation Status)

### 3.1 Notification Types ✅

- `reaction` — Someone reacted to your post
- `comment` — Someone commented on your post
- `mention` — Someone mentioned you (@handle in post/comment)
- `chat_message` — Someone sent you a message
- `connection_request` — Someone wants to connect
- `event_rsvp` — Someone RSVP'd to your event

### 3.2 Read / Unread State ✅

- Mark single as read
- Bulk mark all as read
- `read_at` timestamp
- Unread indicator in navigation (badge)

### 3.3 Deterministic Ordering ✅

- Sort by `created_at` descending
- No engagement weighting

### 3.4 Cross-Surface Integrity ✅

- Click-through routes correctly (Feed, Events, Chat, Directory)
- No redirect loops
- Graceful fallback when referenced content deleted

### 3.5 Blocking & Suspension ✅

- Blocked users do not generate notifications (chat_blocks)
- Suspended users cannot send connection requests
- Disabled accounts cannot send connection requests

---

## 4. Explicit Non-Goals (MVP)

- Push notifications
- Email notifications
- Engagement optimization
- Urgency manipulation

---

## 5. Dependencies

- Feed reaction/comment schema
- Chat integration (`chat_messages`, `chat_rooms`)
- Connection requests (`connection_requests`)
- Events (`events`, `event_rsvps`)
- Profile identity mapping (`profiles.handle` for mentions)

---

## 6. Acceptance Criteria

| Criterion                                        | Status |
| ------------------------------------------------ | ------ |
| Notifications render at /dashboard/notifications | ✅     |
| Notifications ordered by created date            | ✅     |
| Members can mark notifications as read           | ✅     |
| Navigation shows unread indicator                | ✅     |
| Links route correctly                            | ✅     |
| No broken links when source removed              | ✅     |
| Blocking rules respected                         | ✅     |

---

## 7. Related Docs

- [IA Baseline](./ia-baseline.md)
- [Epic: Events](./epic-events.md)
- [Epic: Feed](./epic-feed.md)
