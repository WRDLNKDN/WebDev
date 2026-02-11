# Supabase SQL

This folder contains Supabase schema, security (RLS), and dev seed SQL.

## Structure

- `migrations/` contains ordered SQL scripts to create/update schema and
  policies.
- `seeds/` contains optional development-only data scripts.

## Conventions

- Keep table/schema changes separate from RLS policy changes.
- RLS policies should be minimal and explicit.
- Public read access must never expose pending/rejected/disabled profiles.

## Storage: avatars bucket

Profile avatar uploads use the **`avatars`** storage bucket. The main tables and
RLS migrations configure it:

- `20260121180000_tables.sql` inserts/updates the `avatars` bucket (public, 2MB
  limit, image MIME types).
- `20260121180005_rls.sql` adds storage policies so authenticated users can
  **INSERT** to `avatars` and anyone can **SELECT** (public read for profile
  images).

If you still see \"Bucket not found\" after running migrations, create the
bucket manually in **Supabase Dashboard** → **Storage** → **New bucket**
(`avatars`, public).

## Running

### Local CLI (`supabase start`)

From the **project root** (parent of `supabase/`):

```bash
supabase start
```

To **reset the database** and re-apply migrations + seed without hitting a known
502 on container restart, use DB-only reset then start:

```bash
supabase stop
SUPABASE_DB_ONLY=true supabase db reset
supabase start
```

If you already ran `supabase db reset` and got **502: An invalid response was
received from the upstream server** after "Restarting containers...", the
migrations and seed usually applied correctly; the 502 is from Kong failing to
reach a service during restart. Fix it by:

```bash
supabase stop
supabase start
```

Then open `http://localhost:54321` (or Studio at 54323). If 502 persists, try
the DB-only reset flow above.

**NOTICEs** like `function public.get_feed_page(...) does not exist, skipping`
are normal on a fresh or reset DB: the migration drops objects before creating
them, and "skipping" just means there was nothing to drop.

### Hosted / SQL Editor

Copy/paste scripts into the Supabase SQL Editor in order:

1. `migrations/20260121180000_tables.sql` — all tables, functions, triggers
   (including avatars bucket)
2. `migrations/20260121180005_rls.sql` — all RLS policies and privileges
   (including avatars storage policies)

Optional (dev only):

- `seed/seed.sql`

## Microsoft (Azure) OAuth Setup

If you see `{"code":400,"msg":"Unsupported provider: provider is not enabled"}`:

### Using HOSTED Supabase (<https://xxx.supabase.co>)

`config.toml` does **not** apply. Configure in the Dashboard:

1. Supabase Dashboard → **Authentication** → **Providers** → **Azure**
2. Enable Azure and enter your Client ID and Secret from Azure
3. Add redirect URI in Azure app:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`

### Using LOCAL Supabase (<http://localhost:54321> or 127.0.0.1:54321)

1. **Create an Azure app** at [portal.azure.com](https://portal.azure.com) →
   Microsoft Entra ID → App registrations → New registration.

2. **Supported account types**: Choose **"Accounts in any organizational
   directory (Any Microsoft Entra ID tenant - Multitenant) and personal
   Microsoft accounts (e.g. Skype, Xbox)"**. If you pick "My organization only",
   you'll get "not enabled for consumers" when signing in with @outlook.com or
   other personal accounts.

3. **Add redirect URI** in the app: `http://localhost:54321/auth/v1/callback`
   (Azure requires `localhost`, not `127.0.0.1`.)

4. **Add to `.env`** at project root (both must be non-empty):

   ```text
   SUPABASE_AZURE_CLIENT_ID=your-application-client-id
   SUPABASE_AZURE_CLIENT_SECRET=your-client-secret-value
   ```

5. **Verify env** (optional): `bash scripts/verify-azure-env.sh`

6. **Restart Supabase** from project root:

   ```bash
   supabase stop && supabase start
   ```

## Security: OAuth redirect URLs

To prevent **open redirect** attacks, OAuth callback URLs must be allowlisted:

- **Hosted Supabase:** In Dashboard → **Authentication** → **URL
  Configuration**, set **Redirect URLs** to your allowed origins only (e.g.
  `https://yourdomain.com/auth/callback`,
  `http://localhost:5173/auth/callback`). Do not use wildcards for production.

- **Local:** `config.toml` and the Auth server restrict redirects; ensure
  `redirectTo` in the app matches your configured site URL / redirect allowlist.
