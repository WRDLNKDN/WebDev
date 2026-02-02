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

## Running

Copy/paste scripts into the Supabase SQL Editor in order:

1. `migrations/001_profiles_table.sql`
2. `migrations/002_profiles_rls.sql`

Optional (dev only):

- `seeds/001_dev_seed.sql`

## Microsoft (Azure) OAuth Setup

If you see "provider is not enabled" when using Microsoft sign-in:

1. **Create an Azure app** at [portal.azure.com](https://portal.azure.com) → Microsoft Entra ID → App registrations → New registration.

2. **Add redirect URI** in the app: `http://localhost:54321/auth/v1/callback`
   (Azure requires `localhost`, not `127.0.0.1`.)

3. **Add to your `.env`** (project root):
   ```
   SUPABASE_AZURE_CLIENT_ID=your-application-client-id
   SUPABASE_AZURE_CLIENT_SECRET=your-client-secret-value
   ```

4. **Restart Supabase** so it picks up the config:
   ```bash
   supabase stop && supabase start
   ```
