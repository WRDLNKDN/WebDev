# Mobile Layout & Error Message Audit

Audit of main screens and error handling across the frontend.

[← Docs index](./README.md)

## 1. Mobile Layout Issues

### Critical

- **ChatPage:** Room list (280px) + content side-by-side; on mobile content
  squished or overflows. Fix: hide list when viewing a conversation; back to
  list via header.
- **ChatRoomList:** Fixed width 280; no mobile behavior. Fix: full width on xs,
  280 on md.
- **ChatPage:** Container m:2 on all sizes. Fix: reduce margin on xs.

### Moderate

- **Dashboard:** Action buttons can overflow on narrow screens. Already has
  flexWrap; ensure gap and alignment on wrap.
- **LandingPage:** Verify Profile Grid (PortfolioFrame, IdentityHeader) on
  mobile.
- **AdminApp:** Header + nav might wrap awkwardly. Use flexWrap, stack on xs.
- **Join:** Wizard card padding—check step content overflow on narrow.

### Minor / Already OK

- **Directory:** Fixed: search, sort, filters stack on mobile.
- **Feed:** Fixed: header stacks, sidebars static on mobile.
- **Home, EventsPage, IdentityHeader:** Use responsive breakpoints.

### Additional Mobile Polish (2026-02-21)

- **Feed:** Post action buttons and comment actions now use larger tap targets
  and better wrap spacing on mobile.
- **DirectoryRow:** Connection action buttons stack and stretch on mobile for
  clearer touch controls.
- **MessageInput:** Attach/emoji/GIF/send controls and input height are larger
  on mobile.
- **Dashboard:** Edit Profile and Edit Links action buttons now stack full-width
  on small screens.
- **NotificationsPage:** Connection request Approve/Decline actions stack on
  mobile.
- **LandingPage:** Connection buttons (Connect/Following/Unfollow) stack cleanly
  on mobile.
- **ProjectPage, EventsPage, EventDetailPage, ContentSubmitPage, HelpPage:**
  Header and CTA/action rows now stack or expand for mobile readability.

---

## 2. Error Message Improvements

### Context-Aware Messages

- **Directory search error:** Was "Something went wrong..."; fixed to "No member
  found with that name. Please try a different search or try again."
- **Directory empty results:** Fixed to "No member found" / "No member found
  with that name or filters..."
- **useChat room not found:** Fixed to "This chat could not be found. It may
  have been deleted."
- **useChat messages:** Fixed to "Messages could not be loaded. Please try
  again."
- **useChat send:** Fixed to "Your message could not be sent. Please try again."
- **useChat auth:** Fixed to "You need to sign in to send messages."
- **StartDmDialog:** Fixed to "Could not start a chat with this member. Please
  try again."
- **ReportDialog:** Fixed to "Your report could not be submitted. Please try
  again."
- **MessageInput file size:** Fixed to "This file is too large. Maximum size is
  6MB."
- **MessageInput file type:** Fixed to "This file type is not supported. Please
  choose an image or document."
- **LandingPage follow:** Fixed to "Could not connect. Please try again."
- **AdminGate:** Fixed to "You don't have permission to view this page."
- **errors.ts duplicate key:** Fixed to "That already exists. Try a different
  value."

### Base Library (errors.ts)

404, 401, 403, 500/502/503, Network, 429—all OK.

---

## 3. Implementation Checklist

### Mobile (implemented)

- [x] ChatPage: hide room list when in conversation; hide content when no room
- [x] ChatRoomList: responsive width (100% xs, 280 md)
- [x] ChatPage container: reduce margin on xs
- [x] Dashboard actions: wrap on very narrow (IdentityHeader useFlexGap,
      minWidth: 0)
- [x] AdminApp header: responsive nav (flexWrap, minWidth: 0, reduced px on xs)
- [x] LandingPage: Profile grid (PortfolioFrame column on xs, responsive
      padding)
- [x] Join: wizard card padding, step content overflow (responsive buttons,
      overflow handling)

### Errors (implemented)

- [x] useChat: room, messages, send, edit, delete, auth
- [x] StartDmDialog, ReportDialog, MessageInput
- [x] LandingPage follow
- [x] AdminGate
- [x] errors.ts duplicate key

## See also

- [Docs index](./README.md)
- [Feed](./feeds-api.md) — activity stream
- [Chat MVP spec](./chat/MVP_CHAT_SPEC.md)
- [Directory API](./directory.md)
