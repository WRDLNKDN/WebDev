# PR testing steps

[← Docs index](../README.md)

Use this checklist when testing the branch before merge. Covers Feed, search,
profile routes (IA), Directory, footer, and Dashboard.

---

## 1. Profile routes (IA)

- [ ] **Canonical profile URL**  
       Open a profile via Directory or Feed → URL is `/profile/{handle}` (not
      `/u/`).

- [ ] **Legacy redirect**  
       Visit `/u/{handle}` (e.g. `/u/nickwc`) → redirects to `/profile/{handle}`
      and profile loads.

- [ ] **Profile links**  
       From Feed (post author, connections list) and Directory (card) → click
      through to profile; URL is `/profile/{handle}`.

- [ ] **Edit profile “Your public link”**  
       Dashboard → Edit Profile → handle field helper text shows `/profile/...`
      (not `/u/`).

---

## 2. Navbar search

- [ ] **Search only when logged in**  
       Logged out: no search box. Log in → search box appears next to Dashboard.

- [ ] **Type 2+ characters**  
       After ~300 ms a dropdown appears with matching profiles (by handle or
      display name).

- [ ] **Click a match**  
       Navigate to that person’s profile at `/profile/{handle}`; dropdown
      closes.

- [ ] **Find yourself**  
       Search for your own handle or name → your profile appears in the list;
      click → your profile page.

- [ ] **No matches**  
       Search for something with no matches → dropdown shows “No matches” and
      “View all in Directory”; link goes to `/directory?q=...`.

- [ ] **Search button**  
       Type a query and click “Search” (or Enter) → go to `/directory?q=...`
      with the query.

- [ ] **Click outside**  
       With dropdown open, click elsewhere → dropdown closes.

---

## 3. Directory page

- [ ] **From navbar search**  
       Submit search (button or Enter) → land on `/directory?q=...`; search box
      on page shows the query and list is filtered.

- [ ] **Type in Directory search**  
       Change the search box on Directory → URL updates to `?q=...` and list
      filters.

- [ ] **Discover People (Feed)**  
       From Feed empty state, click “Discover People” → go to `/directory`.

- [ ] **Directory card**  
       Click a card → go to `/profile/{handle}`.

---

## 4. Feed page

- [ ] **Layout**  
       Header: “Welcome to your Feed” + subtitle. No search on the page (search
      is in navbar only).

- [ ] **Left column**  
       “Your Weirdling” (step 1, “Tweak your profile…”, View Dashboard). “Your
      connections” with bullet list (connect from profile, LinkedIn, work
      mottos, mutual contributions).

- [ ] **Center**  
       “Start a post” (step 2, text area, helper text, image icon, Post). “Sort
      by: Recent”. Empty state: “Nothing here yet”, “Fill your feed by
      connecting with Weirdlings”, “Discover People”.

- [ ] **Right column**  
       “WRDLNKDN News” (two items). “Your Connections” with search and
      connection rows (avatar, name, link).

- [ ] **Posting**  
       Type in “Start a post”, click Post → post appears (if API is up). Sort
      and feed load behave as before.

---

## 5. Dashboard

- [ ] **No MVP badge**  
       Dashboard profile card has no “Charging: Focused on MVP” (or similar)
      badge; only avatar, name, tagline, bio, Edit Profile, Settings.

- [ ] **Edit Profile / Settings**  
       Buttons still open the correct dialogs.

---

## 6. Footer

- [ ] **Contact link**  
       “Contact” goes to  
       `https://github.com/WRDLNKDN/Agreements?tab=readme-ov-file#contact`  
       (opens in new tab).

- [ ] **Email**  
       “<info@wrdlnkdn.com>” opens default mail client (mailto).

- [ ] **Legal links**  
       Terms of Service, Privacy Policy, Community Guidelines link to in-app
      pages (`/terms`, `/privacy`, `/guidelines`). Legal (Canonical Index) opens
      GitHub wiki.

---

## 7. Join flow (Intent)

- [ ] **Step labels**  
       Progress shows: Welcome → Sign in → **Intent** → Profile (no “Values”).

- [ ] **Step 3**  
       Header “Intent”, subtext “Help us understand why you’re here and how you
      plan to participate.” Options and flow unchanged.

---

## 8. Smoke / build

- [ ] **Build**  
       `npm run build` succeeds.

- [ ] **Typecheck**  
       `npm run typecheck` succeeds.

- [ ] **E2E (if run)**  
       Critical paths (e.g. sign-in, Feed, Directory) pass if you run E2E tests.

---

## Quick reference

| Area        | What to check                                         |
| ----------- | ----------------------------------------------------- |
| Profile URL | `/profile/{handle}` everywhere; `/u/` redirects       |
| Search      | Navbar dropdown + “Search” → Directory; find yourself |
| Directory   | `?q=` in URL and in-page filter; cards → profile      |
| Feed        | Layout per wireframe; no search on page               |
| Dashboard   | No MVP badge                                          |
| Footer      | Contact → Agreements #contact; email mailto           |
