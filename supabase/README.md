# Supabase SQL

This folder contains Supabase schema, security (RLS), and dev seed SQL.

## Structure

- `migrations/` contains ordered SQL scripts to create/update schema and policies.
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
