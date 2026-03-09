# Avatar Storage Spec

## Overview

Avatars are served via **Vercel CDN** (static presets) and **Supabase Storage**
(user uploads, AI Weirdlings). All stored images are capped at 512×512 and ≤1MB
for fast loads and consistent UX.

---

## 1. Preset Weirdlings (Edit Profile picker)

**Location:** `public/assets/og_weirdlings/`  
**Files:** `weirdling_1.png` … `weirdling_7.png`

- Hosted as static assets in the app
- Served by **Vercel CDN** on deploy
- No Supabase storage required
- URLs: `/assets/og_weirdlings/weirdling_N.png`
- Edit Profile uses a preset-only picker (square tiles, no per-avatar title
  text)
- Default avatar is **Greenling** (`weirdling_1.png`) when no profile/provider
  photo is available
- Picker shows a numeric fallback tile if a preset image fails to load

---

## 2. User Photo Avatars

**Bucket:** `avatars` (Supabase Storage)  
**Limits:** 1MB max, 512×512 max dimensions  
**Formats:** JPEG, PNG, GIF, WebP

- Client-side processing (`processAvatarForUpload`) resizes and compresses
  before upload
- Path: `{userId}-{timestamp}.{ext}`
- Public read via Supabase Storage URLs

---

## 3. AI Weirdling Previews (Future)

**Bucket:** `weirdling-previews`  
**Purpose:** Temporary AI-generated preview images (~1hr TTL, cron cleanup)  
**Limits:** 1MB, JPEG/PNG/WebP

---

## 4. AI Weirdling Avatars (Permanent)

**Bucket:** `weirdling-avatars`  
**Purpose:** User-confirmed AI Weirdling avatars  
**Limits:** 1MB, 512×512, JPEG/PNG/WebP

---

## CDN & Performance

- **Presets:** Vercel’s global CDN serves `public/` assets
- **Uploaded avatars:** Supabase Storage CDN (or app proxy if configured)
- **Resizing:** Done client-side before upload; no server-side image pipeline
