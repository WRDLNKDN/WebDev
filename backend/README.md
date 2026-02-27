# WRDLNKDN Backend

[← Docs index](../docs/README.md)

Express API for feeds, admin, Weirdling, and health. Same code runs locally and
on Vercel.

## Local development

From the **project root**:

```sh
npm run dev
```

This starts:

- **Vite** (frontend) on port 5173 — proxies `/api` to the backend
- **Supabase** (local)
- **Backend** (`tsx watch backend/server.ts`) on port 3001
- Health check script

So `/api/feeds`, `/api/health`, etc. are served by this backend; the frontend
uses relative URLs and Vite forwards them to `http://localhost:3001`.

Do **not** set `VITE_API_URL` in `.env` for local dev so the app uses the proxy.

## Production (Vercel)

- The same Express app is mounted at `/api` via `api/index.ts` and `vercel.json`
  rewrites.
- Frontend and API are on the same host (`wrdlnkdn.vercel.app`), so leave
  `VITE_API_URL` **unset** in Vercel; the app will request `/api/feeds` etc. on
  the same origin.

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (optional) `ADMIN_TOKEN` in
Vercel for the API. For one-click unsubscribe links in emails, set
`UNSUBSCRIBE_SECRET` (same secret used when generating tokens).

**Feed 500 errors:** If `/api/feeds` returns 500, the hosted Supabase project
likely doesn’t have the feed schema. Run the migrations on your **hosted**
project (see `supabase/README.md` → “Hosted / SQL Editor”): apply
`migrations/20260121180000_tables.sql` then `migrations/20260121180005_rls.sql`
in the Supabase Dashboard SQL Editor. That creates `feed_items`,
`feed_connections`, and the `get_feed_page` RPC used by the API.

## Structure

- `app.ts` — Express app (routes, middleware), exported for use by `server.ts`
  and `api/index.ts`
- `server.ts` — Local only: imports `app` and calls `app.listen(PORT)`
- `api/index.ts` (project root) — Vercel serverless: imports `app` and forwards
  `(req, res)` to it
