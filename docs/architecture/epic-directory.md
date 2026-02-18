<!-- markdownlint-disable MD013 MD060 -->

# Epic: Directory (Member Discovery Surface) #256

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Application / Member Discovery  
**Canonical Route:** `/directory`

The Directory is the canonical authenticated member discovery surface. It is
structurally distinct from the Feed (content surface) and Dashboard (private
control).

**Feed = content surface**  
**Directory = people discovery surface**

---

## 1. Purpose

Enable members to:

- Discover other members intentionally
- Search by handle or name
- Filter by profile attributes (industry, location, skills, connection status;
  intent and values when schema supports)
- Browse aligned professionals
- Navigate to public profiles via `/profile/:handle`

This surface is optimized for signal-based connection, not content consumption.

---

## 2. Canonical Route & Access

- **Route:** `/directory`
- **Access:** Authenticated (RequireOnboarded → redirects to `/join` if
  signed-out)
- **IA alignment:** See [IA Baseline](./ia-baseline.md). Governed by IA: Add
  Directory as Canonical Surface (#191).

---

## 3. Core Capabilities (Implementation Status)

### 3.1 Member List View ✅

- Paginated (offset-based, 25 per page)
- Lazy-load "Load more"
- No engagement-based ranking

### 3.2 Search ✅

- Handle (via `q` param)
- Display name (via `q` param)
- Tagline, industry, location, skills (API: `get_directory_page`)

### 3.3 Filtering ✅

- Industry
- Location
- Skills (comma-separated, AND filter)
- Connection status (not_connected, pending, pending_received, connected)
- URL-persisted filters

### 3.4 Sort Logic ✅

- Deterministic options: recently_active, alphabetical, newest
- No algorithmic feed ranking
- No engagement weighting

### 3.5 Profile Navigation ✅

- Click-through to `/profile/:handle` (or `/profile/:id` when no handle)
- DirectoryRow and DirectoryCard link to profile

---

## 4. Explicit Non-Goals (Verified)

The Directory does **not**:

- Display posts ✅
- Display activity feed content ✅
- Act as a secondary Feed ✅
- Use engagement-driven ranking ✅
- Collapse into `/feed` ✅

Feed functionality is governed by [Epic: Feed](./epic-feed.md) (#313).

---

## 5. Dependencies

- Profile data model (industry, location, skills, tagline, profile_visibility)
- Authentication (RequireOnboarded)
- [IA governance](./ia-baseline.md) (#191)
- [Directory API](../directory.md)

---

## 6. Acceptance Criteria

| Criterion                                            | Status |
| ---------------------------------------------------- | ------ |
| `/directory` exists and is authenticated             | ✅     |
| Directory is distinct from `/feed`                   | ✅     |
| Members are searchable and filterable                | ✅     |
| No engagement-based ranking logic exists             | ✅     |
| Clicking a member routes to `/profile/:handle`       | ✅     |
| Navigation highlights Directory when on `/directory` | ✅     |
| Behavior aligns with Canonical IA                    | ✅     |

---

## 7. Governance

All child issues under this Epic must:

- Respect separation between Feed and Directory
- Maintain route integrity
- Avoid introducing algorithmic ranking behavior
- Reference this Epic (#256) explicitly

---

## 8. Related Docs

- [Directory API](../directory.md)
- [IA Baseline](./ia-baseline.md)
- [Epic: Feed](./epic-feed.md) — content surface (distinct)
- [Epic: Home Dashboard](./epic-home-dashboard.md) — profile and connections
