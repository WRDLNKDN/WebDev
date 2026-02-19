QA / Acceptance Test Plan: Dashboard Avatar Setup & Editing (MVP)

Scope:

- Avatar selection / editing via Dashboard
- Active avatar propagation across UI
- All three sources: Upload, Preset, AI Weirdling
- Replacement warnings, modals, and reactive updates
- AI generation limits, preview, and Accept/Refine flow

---

1. Initial State

- New user logs in with no avatar.
- Dashboard shows:
  - Left: Profile picture placeholder with Upload button
  - Right: Avatar Replacement Box
    - AI generation form on top
    - Preset grid below
- Inline text above box: "Any selection here will replace your current avatar."

Check:

- Placeholder visible
- Inline text visible
- AI form and preset grid render correctly

---

2. Upload Photo Flow

- Click Upload button on left placeholder
- Select a valid image (<512x512, <=1MB)
- Confirm upload
- Verify:
  - Image becomes **active avatar**
  - Image propagates to profile header, feed, comments, nav
  - Success toast appears
- Error cases:
  - Oversized image → inline error message
  - Invalid format → inline error message

---

3. Preset Selection Flow

- Click a preset in grid
- If active avatar exists:
  - Confirmation modal appears: "This will replace your current avatar.
    Continue?"
  - Cancel → no change
  - Confirm → updates active avatar
- If no active avatar exists:
  - Selection updates active avatar immediately
- Verify:
  - Avatar updates everywhere immediately
  - Success toast appears
  - avatar_type = preset
  - avatar_id / image_url stored correctly
  - Changes persist after logout/login

---

4. AI Weirdling Generation Flow

- Fill all required fields:
  - Primary Color
  - Held Object
  - Hair Style
  - Hair Color
  - Based on Animal or Persona
- Click Generate
- Verify:
  - Preview appears inline above form
  - Form remains editable
  - Inline warning text visible
- Accept:
  - Click Accept
  - Active avatar updated, overwriting prior avatar
  - Image copied to permanent storage
  - Propagates to profile, feed, comments, nav
- Refine:
  - Change fields
  - Click Generate
  - New preview replaces old preview
  - No persistence until Accept
- Error cases:
  - Preview generation fails → inline error
  - Expired preview → error message
  - Daily preview limit exceeded → preview blocked, message: "You’ve reached
    today’s Weirdling generation limit. Try again tomorrow."
- Validate avatar_type = ai, structured fields saved, permanent image_url stored

---

5. Replacement Behavior

- Test combinations:
  - Upload → AI Accept → active avatar updates correctly
  - Upload → Preset select → active avatar updates correctly
  - AI Accept → Preset select → active avatar updates correctly
- Verify:
  - Inline warning text displayed
  - First-time modal confirmation triggers correctly
  - Success toast appears on overwrite
  - Only one active avatar exists at all times

---

6. Rendering Verification

- Profile header: 160px circular
- Feed posts: 48px circular
- Comments: 48px circular
- Nav identity icon: 48px circular
- Verify:
  - Active avatar appears correctly per type
  - Fallback avatar shown if no active avatar
  - Updates reflected immediately without full page reload
  - Responsive layout on mobile / desktop

---

7. Rate Limiting & Cost Controls (AI Only)

- Generate AI Weirdling previews 5 times → all succeed
- 6th generation → blocked, UI message displayed
- Verify:
  - Preview images stored with TTL = 1 hour
  - Accept copies image to permanent storage
  - Limit counter increments only on successful generation
  - Failed or blocked attempts do not increment counter

---

8. Accessibility

- Avatar alt text: "Avatar for {display_name}"
- Upload button accessible via keyboard
- Inline warning text readable by screen readers
- Modal confirmation accessible and keyboard navigable

---

9. Out of Scope

- Animated avatars
- Backgrounds, frames, badges
- Multi-image preview comparisons
- Marketplace or collectibles
- Advanced moderation workflows

---

10. Acceptance Criteria Summary

- Dashboard renders all three avatar options correctly
- Inline warning text visible above Replacement Box
- First-time modal confirmation triggers on overwrite
- Active avatar updates immediately on all sources
- Avatar propagates to profile, feed, comments, nav
- AI preview TTL, accept, and daily limits enforced
- Upload and preset flows work as intended
- Single active avatar per user
- Responsive and accessible UI
- Changes persist after logout/login
