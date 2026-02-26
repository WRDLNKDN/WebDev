<!-- markdownlint-disable MD013 MD060 -->

# Post Component Unification Plan

**Status:** Ready for implementation  
**Epic:** Unify Post behavior across Feed, Chat Full, and Groups  
**T-Shirt:** L

## 1. Summary

Post-style content in Chat Full (group messages) must use the same canonical
Post component as Feed. This plan defines the architecture and implementation
steps to extract a reusable `PostCard` and enforce a single source of truth for
Post behavior.

**Design principle:** Entity logic belongs to the entity layer. Container logic
belongs to the container layer. If it looks like a Post, it behaves like a Post.

---

## 2. Current State

| Surface   | Component     | Location                              | Reactions                     | Three-dot menu       | Timestamp          |
| --------- | ------------- | ------------------------------------- | ----------------------------- | -------------------- | ------------------ |
| Feed      | `FeedCard`    | `src/pages/feed/Feed.tsx` ~L521       | like, love, inspiration, care | Edit, Delete         | relative (5m, 3h)  |
| Chat Full | `MessageList` | `src/components/chat/MessageList.tsx` | Free emoji (👍❤️😂😮😢🙏)     | Edit, Delete, Report | absolute (7:32 AM) |

**Data sources:**

- Feed: `feed_items` via `FeedItem` type
- Chat: `chat_messages` via `MessageWithExtras` (reactions from
  `chat_message_reactions` with `emoji` column)

**No shared-post-to-chat** feature exists; Chat messages and Feed posts are
separate entities. Unification treats post-style Chat content (e.g. group
messages rendered as cards) as Posts for UX purposes.

---

## 3. Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Container Layer                           │
│  Feed.tsx          ChatPage.tsx (MessageList)    Groups (future) │
│  Uses PostCard     Uses PostCard                  Uses PostCard   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Entity Layer (Canonical)                        │
│  src/components/post/PostCard.tsx                                │
│  - Post body, images, GIFs, link preview                         │
│  - ReactionsBar (like, love, inspiration, care)                  │
│  - PostActionMenu (Edit, Delete, Report?)                        │
│  - formatPostTime (shared timestamp)                             │
└─────────────────────────────────────────────────────────────────┘
```

**Rule:** Container never redefines Post behavior. Feed defines canonical; Chat
and Groups consume it.

---

## 4. Canonical Post Interface

### 4.1 `PostCardInput` (normalized props for PostCard)

```ts
type PostCardInput = {
  id: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  actor: {
    handle: string | null;
    display_name: string | null;
    avatar: string | null;
  };
  images?: string[];
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
  bodyGifUrls?: string[];
  reactions: {
    like_count: number;
    love_count: number;
    inspiration_count: number;
    care_count: number;
    viewer_reaction: ReactionType | null;
  };
  canEdit: boolean;
  canDelete: boolean;
  container: 'feed' | 'chat';
  variant?: 'default' | 'compact';
};
```

### 4.2 `PostCardActions` (callbacks)

```ts
type PostCardActions = {
  onReaction: (id: string, type: ReactionType) => void;
  onRemoveReaction: (id: string) => void;
  onEdit?: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => void;
  onReport?: (id: string) => void;
  onCommentToggle?: (id: string) => void;
  onRepost?: (item: unknown) => void;
  onSend?: (item: unknown) => void;
};
```

### 4.3 Optional sections (Feed-specific)

- **Comments**: When `commentsExpanded`, `comments`, `onAddComment` provided
- **Repost/Send**: When `onRepost`, `onSend` provided
- **Link preview dismiss**: When `onDismissLinkPreview` provided

---

## 5. Reaction Mapping (Chat ↔ Feed)

Chat stores `emoji` in `chat_message_reactions`. Canonical types are
`like | love | inspiration | care`.

**Bidirectional mapping:**

| ReactionType | Emoji (storage) |
| ------------ | --------------- |
| like         | 👍              |
| love         | ❤️              |
| inspiration  | 💡              |
| care         | 🤝              |

**Adapter logic:**

- When rendering Chat message: aggregate reactions by emoji, map to counts per
  type; viewer reaction = current user's emoji mapped to type
- When user reacts: map type → emoji for insert/delete
- Legacy emoji (😂😮😢🙏): Can be shown as "other" or migrated on read to
  nearest type. MVP: only support 4 types; non-mapped emoji ignored in unified
  view (or displayed as extra pills until migration)

**Recommendation:** Use the 4-type system for Chat when PostCard is used. Map
existing reactions on read. New reactions use the 4 types only.

---

## 6. Shared Subcomponents

| Component         | Location                                  | Purpose                                                       |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `PostCard`        | `src/components/post/PostCard.tsx`        | Main canonical card                                           |
| `ReactionsBar`    | `src/components/post/ReactionsBar.tsx`    | 4-type popover + count                                        |
| `PostActionMenu`  | `src/components/post/PostActionMenu.tsx`  | Three-dot Edit/Delete/Report                                  |
| `formatPostTime`  | `src/lib/post/formatPostTime.ts`          | Canonical timestamp                                           |
| `LinkPreviewCard` | `src/components/post/LinkPreviewCard.tsx` | Extract from Feed                                             |
| Body utils        | `src/lib/post/bodyUtils.ts`               | extractBodyUrls, isGifUrl, removeGifUrlsFromBody, linkifyBody |

---

## 7. File Structure

```text
src/
├── components/
│   └── post/
│       ├── PostCard.tsx          # Canonical Post card
│       ├── ReactionsBar.tsx      # Shared reaction UI
│       ├── PostActionMenu.tsx    # Three-dot menu
│       └── LinkPreviewCard.tsx   # Link preview (extracted)
├── lib/
│   └── post/
│       ├── formatPostTime.ts
│       ├── bodyUtils.ts
│       └── adapters.ts           # FeedItem→Input, Message→Input, reaction emoji↔type
```

---

## 8. Implementation Phases

### Phase 1: Extract shared utilities and subcomponents

1. Create `src/lib/post/formatPostTime.ts` – move `formatTime` from Feed (and
   consolidate with NotificationsPage if identical).
2. Create `src/lib/post/bodyUtils.ts` – move `extractBodyUrls`, `isGifUrl`,
   `removeGifUrlsFromBody`, `linkifyBody`, `URL_REGEX`.
3. Create `src/components/post/LinkPreviewCard.tsx` – extract from Feed.
4. Create `src/components/post/ReactionsBar.tsx` – extract REACTION_OPTIONS +
   popover from FeedCard.
5. Create `src/components/post/PostActionMenu.tsx` – Edit, Delete, Report
   (optional) as Menu.

### Phase 2: Create canonical PostCard

1. Create `PostCardInput` and `PostCardActions` types.
2. Implement `PostCard` using extracted subcomponents and bodyUtils.
3. Support optional: comments section, Repost/Send, link preview dismiss.
4. Feed-specific: `FeedCard` becomes thin wrapper that adapts `FeedItem` →
   `PostCardInput` and delegates to `PostCard`.

### Phase 3: Integrate Feed

1. Refactor `Feed.tsx`: replace inline `FeedCard` logic with `PostCard` +
   adapter.
2. Keep Feed-specific handlers (comments, repost, send) in Feed; pass as
   actions.
3. Verify behavior unchanged (reactions, menu, comments, timestamps).

### Phase 4: Integrate Chat

1. Create `adaptMessageToPostInput` in `src/lib/post/adapters.ts`:
   - `content` → `body`
   - Map reactions (emoji → type counts, viewer)
   - `sender_profile` → actor
2. Create reaction mapping in `useChat`: `REACTION_TYPE_TO_EMOJI`,
   `EMOJI_TO_REACTION_TYPE`.
3. Update `MessageList`: for group messages (or all messages when using
   PostCard), render via `PostCard` with adapted input.
4. Update `onReaction` in ChatPage/useChat to accept `ReactionType`, map to
   emoji before DB write.
5. Unify three-dot: include Report when `onReport` provided.
6. Use `formatPostTime` instead of `formatMessageTime` for PostCard timestamps.

### Phase 5: Error handling and permissions

1. Ensure no silent failure in reactions: surface errors via snackbar/toast.
2. Permission checks: `canEdit` = isOwner, `canDelete` = isOwner (or admin when
   implemented).
3. Align Chat permission logic with Feed (e.g. only owner can edit/delete own
   content).

---

## 9. Acceptance Criteria Checklist

- [ ] Post card in Chat Full uses the same `PostCard` component as Feed.
- [ ] Reaction types and toggling behavior are identical (like, love,
      inspiration, care).
- [ ] Reaction counts update deterministically and persist.
- [ ] Three-dot menu behavior matches Feed (Edit, Delete; Report when in Chat
      and provided).
- [ ] Permission checks match Feed.
- [ ] No silent failure in reactions (errors surfaced).
- [ ] No container-specific fork of Post logic.
- [ ] Shared timestamp formatting (`formatPostTime`).
- [ ] Shared `LinkPreviewCard` (Feed and Chat when link in body).

---

## 10. Out of Scope (per spec)

- Chat routing refactor
- IA changes for MVP
- Layout redesign of Chat surface
- Groups implementation (plan allows consumption when built)

---

## 11. Testing

- Run `accessibility.spec.ts` for UI/a11y changes.
- Manual: verify Feed posts behave as before refactor.
- Manual: verify Chat group messages use PostCard, reactions work, menu works.
- Regression: verify comment GIFs, link previews, image lightbox in Feed still
  work.

---

## 12. Commit Memo Suggestion

```text
feat(post): unify PostCard across Feed and Chat

- Extract canonical PostCard, ReactionsBar, PostActionMenu, LinkPreviewCard
- Add formatPostTime and bodyUtils in lib/post
- Adapt FeedItem and MessageWithExtras to PostCardInput
- Map Chat reactions (emoji) to Feed types (like/love/inspiration/care)
- Chat group messages render via PostCard with same behavior as Feed

InOmniaParatus
```
