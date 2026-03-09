<!-- markdownlint-disable MD013 MD060 -->

# Epic: Home Dashboard (Profile-Centric Landing Experience) #103

[← Docs index](../README.md)

**Type:** Epic  
**Scope:** MVP  
**Parent:** Core Product Experience

The Home Dashboard defines the default landing experience for authenticated
users. When signed in, users land on their own profile page (or Feed per IA),
which serves as both a personal dashboard and a public-facing professional
presence.

The Home Dashboard is profile-first, expressive, and creator-oriented. It
emphasizes identity, portfolio, and connection over feeds or passive
consumption.

---

## 1. Epic Goals

- Make the user's profile the center of gravity
- Enable self-expression without friction
- Showcase work and materials as a living portfolio
- Encourage meaningful connections, not mass following

---

## 2. User Story

As an authenticated user, I want to land on my own profile page so that I can
manage my identity, portfolio, and connections in one place and present a
coherent professional presence to others.

---

## 3. Core Capabilities (MVP)

### 3.1 Profile Landing

- If Profile is designated as canonical post-auth surface by IA governance,
  users land on their own profile page. (Current IA: authenticated users land on
  `/feed`; Dashboard at `/dashboard` is the private control surface.)
- The profile page is editable by the owner and viewable by others (permissions
  handled separately)

### 3.2 Profile Identity

Users can edit:

- Display name
- Title (short professional descriptor, tagline — similar to LinkedIn)
- Bio (short-form, editable)
- Links (external links, multiple allowed)

Profile edits are saved immediately or with clear save affordances.

### 3.3 Status & Expression

- **Status message:** Users can set a short, ephemeral-style status message
  labeled "How I'm feeling"

  - Displayed as a visual bubble near or above the profile header
  - Optional and editable
  - Not required to be public-facing in all contexts

- **Profile music:** Users can set profile music
  - Music is muted by default
  - Users can manually play or pause
  - Music does not auto-play
  - Music is optional and removable

### 3.4 Portfolio (Primary Frame)

The primary content area of the profile is a carousel-style portfolio.

Portfolio items may include:

- Documents
- Presentations
- Videos
- Other uploaded or linked materials

Users can:

- View their portfolio
- Add new items
- Reorder items
- Remove items

Portfolio represents the user's professional and creative body of work.

### 3.5 Connections

Users can:

- View their connections
- Add connections (via Directory Connect, profile Connect)
- Remove connections (Disconnect)

The profile displays a Connections section with basic visibility into
connections.

**Connection suggestions** are shown based on:

- Portfolio metadata
- Shared interests or themes
- Overlapping content or participation signals

Connection suggestions must feel contextual, not algorithmically aggressive.

---

## 4. UX Notes

- The Home Dashboard should feel **personal, not performative**
- Avoid feed-first or engagement-bait patterns
- Profile music and status are expressive accents, not core mechanics
- Portfolio is the visual and functional anchor of the page

---

## 5. Out of Scope (MVP)

- Endorsements or recommendations
- Follower counts or engagement metrics
- Algorithmic ranking or boosts
- Public analytics or view counts
- Mandatory social graph growth
- Auto-playing audio

---

## 6. Success Signals

- Users complete and revisit their profile
- Portfolio items are added organically
- Connections form based on shared work, not prompts
- Profiles feel distinct, not templated

---

## 7. Current implementation status

- **Profile landing** — Done. Auth redirects to `/feed` when visiting `/`.
  Dashboard at `/dashboard` is the private control surface. Profile at
  `/profile/:handle` is public identity.
- **Profile identity** — Done. Edit Profile (display name, handle, tagline,
  pronouns, bio, status emoji/message, avatar). Manage links (multiple external
  links). Save via Edit Profile / Edit Links dialogs.
- **Status & expression** — Partial. Status emoji + message ("How I'm feeling")
  in `nerd_creds`; shown in IdentityHeader. **Profile music:** not implemented.
- **Portfolio** — Partial. View portfolio, add items (Add Project), resume
  upload, delete items. **Reorder items:** not implemented (no drag-and-drop).
- **Connections** — Partial. Add/remove via Directory (Connect, Accept, Decline,
  Disconnect) and profile (Connect/Unfollow). No dedicated Connections section
  on profile. No connection suggestions.

**Summary:** The epic is **partially** solved. Identity, links, status message,
portfolio (view + add + delete), and connection actions are in place. Gaps:
profile music (optional), portfolio reorder, dedicated Connections section,
connection suggestions.

---

## 8. Related Epics

- [Epic: Directory](./epic-directory.md) (#256) — member discovery; add/remove
  connections via Connect flow
- [Epic: Feed](./epic-feed.md) (#313) — content surface (distinct from profile)

## 9. How to test

### Prerequisites

- Node 18+
- Supabase CLI (for local Supabase)
- `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and backend env if
  testing API)

### 2. Start the app

```bash
npm install
npm run dev
```

This runs Vite (frontend), Supabase local, and the API. Frontend is usually
`http://localhost:5173`.

### 3. Sign in and land on Dashboard

1. Open `http://localhost:5173`.
2. Sign in (e.g. **Login** or **Sign in** with Google/Microsoft). Use
   `?next=/dashboard` or sign in from a flow that redirects to `/dashboard`.
3. After OAuth callback you should land on **Dashboard** (`/dashboard`). If you
   are sent to `/` instead, use the nav to go to **Dashboard** or open
   `http://localhost:5173/dashboard` while signed in.

### 4. Profile identity

1. On Dashboard, click **Edit Profile**. Change display name, handle, tagline,
   bio, status emoji, status message. Save.
2. Confirm the header updates (name, tagline, status bubble, bio).
3. Click **Settings** → **Manage links**. Add/edit/remove links. Save. Confirm
   the Links section shows your links.

### 5. Portfolio

1. On Dashboard, in the Portfolio area click **Add Project** (or the add card).
   Fill title, description, URL, optional image and tech stack. Submit.
2. Confirm a new project card appears. Open **View Project** if you set a URL.
3. **Resume:** Use the resume card to upload a resume if the feature is present;
   confirm it appears.

### 6. Status & expression

1. In **Edit Profile**, set **Status emoji** and **Status message** (e.g. "How
   I'm feeling"). Save.
2. Confirm the status appears near the profile header (IdentityHeader).

### 7. Gaps (not testable yet)

- **Profile music:** No UI or storage.
- **Portfolio reorder:** No drag-and-drop reorder (delete is implemented).
- **Connections section:** No dedicated Connections list on profile.
- **Connection suggestions:** Not implemented.
