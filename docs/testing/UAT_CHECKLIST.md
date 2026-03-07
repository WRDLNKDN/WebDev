# UAT checklist – Dashboard modals and Resume card

Use this checklist to verify the Dashboard combo box, Add to List button, and
Resume card fixes in UAT across supported OS and browsers.

**Reference:** [CHANGELOG](../../CHANGELOG.md) — Unreleased / Dashboard modals &
Resume card.

---

## Environment

- [ ] **UAT** (not local or prod)
- [ ] Test on at least: **Chrome (Windows 11)**, **Chrome or Safari (macOS)**,
      and one **mobile viewport** (e.g. Chrome DevTools device mode, size XS/S).

---

## 1. Add Links modal

- [ ] From Dashboard, open **Manage Links** (or equivalent) to open the Add
      Links modal.
- [ ] **Category** combo: placeholder or selected value shows **once**, no
      ghosted or overlapping text.
- [ ] **Platform** combo: placeholder or selected value shows **once**, no
      ghosted or overlapping text.
- [ ] **"+ Add to List"** button shows **exactly one plus** (no duplicate plus
      icon).
- [ ] Select Category + Platform, enter a valid URL, add a link; list updates
      and no visual glitches.

---

## 2. Edit Profile modal

- [ ] From Dashboard, open **Edit Profile**.
- [ ] **Industry** (primary industry) combo: selected value (e.g. "Technology
      and Software") shows **once**, no ghosted or overlapping text.
- [ ] **Sub-industry** combo / Autocomplete: placeholder or selected chips show
      cleanly; no ghosted or duplicated placeholder text.
- [ ] Change industry and sub-industries; save; reopen and confirm values
      persisted and render cleanly.

---

## 3. Dashboard Portfolio – Resume card

- [ ] Navigate to **Dashboard → Portfolio** with a **Resume** already uploaded
      (or upload one).
- [ ] **Delete (trash) icon** is visible on the Resume card, **right-aligned**
      in the action row (with "View Document" and, if applicable, "Retry
      Preview").
- [ ] Click **trash** → confirmation dialog appears ("Are you sure you want to
      delete your resume?") with **Cancel** and **Delete**.
- [ ] **Cancel** closes the dialog and keeps the resume.
- [ ] **Delete** (if tested) removes the resume and updates the UI without full
      page refresh.

**If the resume preview failed:**

- [ ] **Retry Preview** is shown when the error does _not_ indicate an
      unsupported file type.
- [ ] Click **Retry Preview** → button shows "Retrying…" and a new request is
      made; after completion, UI updates (success or clear error).
- [ ] If the error indicates the file type is not supported, **Retry Preview**
      is **not** shown and the message is "Preview not available for this file
      type."

---

## Sign-off

- [ ] All items above verified on **Chrome (Windows 11)**.
- [ ] All items above verified on **at least one other** OS/browser (e.g. macOS
      Safari or Chrome).
- [ ] Add Links and Edit Profile modals checked at **mobile viewport** (e.g.
      390×844) for layout and combo box readability.
- [ ] No console errors or silent failures during the above flows.

**Signed off by:** **\*\*\*\***\_**\*\*\*\*** **Date:**
**\*\*\*\***\_**\*\*\*\***
