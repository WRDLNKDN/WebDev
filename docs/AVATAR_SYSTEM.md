# MVP Avatar System — operations & env

## Surfaces

- **Dashboard / Edit Profile:** Upload photo, AI Weirdling form (Generate →
  Refine → Accept), 6 preset Weirdlings.
- **Active avatar:** `profiles.avatar` + `avatar_type` (`photo` | `preset` |
  `ai`). Shown via `/api/me/avatar` (profile, feed, comments, nav).

## Environment variables

| Variable                       | Where                                | Purpose                                                                                                                                                                     |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                 | Frontend build                       | API origin only (no `/api`). Required if the browser loads the app from a different host than the API (e.g. Directory, Weirdling, feeds). Empty = same-origin / Vite proxy. |
| `REPLICATE_API_TOKEN`          | Node API (`backend/`)                | When set, `POST /api/weirdling/generate` uses Replicate Stable Diffusion. When unset, mock preset images.                                                                   |
| `REPLICATE_API_TOKEN`          | Supabase Edge `generate-weirdling`   | Same: real generation when set; otherwise mock placeholder. Set in Supabase Dashboard → Edge Functions → Secrets.                                                           |
| `WEIRDLING_PROMPT_GITHUB_BASE` | Edge `generate-weirdling` (optional) | Base URL for prompt manifest/instructions. Default: `main` branch `src/components/avatar` on GitHub.                                                                        |

## Limits & guardrails

- **Daily AI previews:** 5 per Member per UTC day (`generation_jobs` count).
  `GET /api/weirdling/preview-remaining` returns remaining count.
- **Preview TTL:** 1 hour. After that, **Accept** returns _"Preview expired.
  Generate a new one."_ Idempotent Generate cache is ignored after 1 hour.
- **Saved AI avatar image:** HTTP(S) URLs are verified before save: **≤1MB** and
  **≤512×512** pixels (Sharp metadata). Relative asset URLs (mock) skip
  download.

## Database

Apply Supabase migrations so `profiles.avatar_type`, `get_directory_page`,
`generation_jobs`, etc. exist. Local: `npm run supabase:reset` or
`npx supabase@latest db push` as appropriate.

## Deploy checklist

1. Run migrations on target Supabase project.
2. Set `REPLICATE_API_TOKEN` on API host (and Edge secret if using
   `generate-weirdling`).
3. Rebuild frontend with `VITE_API_URL` if API is on another origin.
4. Confirm `/api/health` and Discover Members load when signed in.
