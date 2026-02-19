<!-- markdownlint-disable MD013 MD060 -->

# Epic: Events (Community Gathering Surface)

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Events / Community  
**Canonical Route:** `/events`

Events provide a structured way for members to create gatherings, discover
upcoming events, RSVP, and form intentional real-time connection moments. Events
are community-first and human-centered.

---

## 1. Purpose

Enable structured professional and community interaction beyond static content
and chat:

- Intentional meetups
- Virtual sessions
- AMAs
- Community town halls
- Project launches

Events strengthen the human layer of WRDLNKDN.

---

## 2. Canonical Route & Access

- **Route:** `/events` (list), `/events/:id` (detail)
- **Access:** Authenticated (RequireOnboarded)
- **IA alignment:** See [IA Baseline](./ia-baseline.md). Events ≠ Feed, Events ≠
  Directory, Events ≠ Chat. Events are scheduled interaction spaces.

---

## 3. Core Capabilities (Implementation Status)

### 3.1 Event List View ✅

- Upcoming events first
- Past events separated visually
- Deterministic ordering by start date
- Host, date/time, location, attendee count

### 3.2 Event Creation (MVP) ✅

- Title, description, date/time, location (virtual/physical)
- Host auto-set to creator
- Validation enforced
- Created event appears immediately

### 3.3 Event Detail Page ✅

- Route: `/events/:id`
- Full description, host profile link
- RSVP Yes / No / Maybe
- Graceful handling of missing/deleted events

### 3.4 RSVP System ✅

- Yes, No, Maybe
- RSVP state persists
- Attendee counts displayed
- Respect blocking rules
- Suspended users cannot RSVP

### 3.5 Blocking & Visibility ✅

- Events from blocked users excluded from list (viewer blocks host or host
  blocks viewer)
- Deterministic sorting (no engagement ranking)

---

## 4. Explicit Non-Goals (MVP)

- Algorithmic event ranking
- Engagement boosting
- Sponsored promotion logic
- Public ticketing marketplace

---

## 5. Dependencies

- Profile identity surface
- Directory linking
- Notifications (event_rsvp)
- Auth enforcement
- IA baseline governance

---

## 6. Acceptance Criteria

| Criterion                              | Status |
| -------------------------------------- | ------ |
| /events exists as authenticated route  | ✅     |
| Events appear in left navigation       | ✅     |
| Events render independently of Feed    | ✅     |
| Deterministic sorting by start date    | ✅     |
| Event detail page routes correctly     | ✅     |
| Members can create events              | ✅     |
| Members can RSVP                       | ✅     |
| Suspended users cannot RSVP            | ✅     |
| Blocked users' events hidden from list | ✅     |

---

## 7. Related Docs

- [IA Baseline](./ia-baseline.md)
- [Epic: Notifications](./epic-notifications.md)
- [Epic: Feed](./epic-feed.md)
