<!-- markdownlint-disable MD013 MD060 -->

# UAT vs PROD Deployment & Supabase

[← Docs index](./README.md)

## Environments

- **UAT:** [webdev-uat.vercel.app](https://webdev-uat.vercel.app/) →
  `lgxwseyzoefxggxijatp.supabase.co`
- **PROD:** [wrdlnkdn.vercel.app](https://wrdlnkdn.vercel.app/) →
  `rpcaazmxymymqdejevtb.supabase.co`

## Problem: UAT Sign-in or Refresh Shows PROD Supabase

If the Google "Choose an account" dialog shows
`rpcaazmxymymqdejevtb.supabase.co` when signing in on webdev-uat.vercel.app, or
a red banner appears on page load/refresh saying **"UAT — WRONG Supabase: using
PROD"**, the deployed build has the PROD Supabase URL baked in.

The banner is correct — fix the deployment configuration below.

## Root cause

webdev-uat.vercel.app is the **Production** domain of the UAT project. The build
that reaches it can come from:

1. **Vercel auto-deploy** (Git push) — uses env vars from Vercel Dashboard
2. **GitHub Actions** — uses `SUPABASE_UAT_URL` / `SUPABASE_UAT_ANON_KEY`
   secrets (from the `uat` environment)

If Vercel auto-deploys first with wrong or unset env vars, the Production domain
gets the wrong build. On refresh, users see the red "UAT — WRONG Supabase"
banner.

## Fix 1: GitHub Actions (recommended)

The workflow deploys UAT to **Production** of the UAT project so webdev-uat gets
the correct build. Ensure:

1. **GitHub** → Repo → Settings → Secrets and variables → Actions
2. **SUPABASE_UAT_URL** = `https://lgxwseyzoefxggxijatp.supabase.co`
3. **SUPABASE_UAT_ANON_KEY** = UAT anon key
4. Push to main to trigger the workflow (or re-run the workflow)

The workflow
([`.github/workflows/vercel-deploy-uat-prod.yml`](../.github/workflows/vercel-deploy-uat-prod.yml))
fails if UAT uses the PROD Supabase project ID.

## Fix 2: Vercel Dashboard (if UAT uses Vercel Git deploy)

If the UAT project is deployed by Vercel's native Git integration:

1. **Vercel** → UAT project → Settings → Environment Variables
2. Set for **Production** (and Preview if used):
   - **VITE_SUPABASE_URL** = `https://lgxwseyzoefxggxijatp.supabase.co`
   - **VITE_SUPABASE_ANON_KEY** = UAT anon key
   - **VITE_APP_ENV** = `uat`
3. Redeploy (Deployments → ⋮ → Redeploy)

## Fix 3: Disable Vercel Git deploys (prevents wrong-build race)

If UAT is deployed by both Vercel Git integration and GitHub Actions, a race can
occur and the wrong build may reach webdev-uat.vercel.app. To ensure only the
workflow deploys UAT:

1. **Vercel** → UAT project → Settings → Git
2. Either:
   - **Disconnect** the Git repository, or
   - Set **Ignored Build Step** to `exit 1` so Vercel never builds from Git
     (GitHub Actions will remain the sole deployment path)
3. Confirm UAT env vars in Fix 2 are correct, then redeploy from the workflow
   (push to main or re-run the workflow)

## Verification

After deploying, sign in on UAT. The Google dialog should show:

`to continue to lgxwseyzoefxggxijatp.supabase.co`

## Backend env (required for Feed, API)

The `/api/*` serverless functions (feeds, directory, etc.) validate JWTs using
**SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY**. These must match the
Supabase project your frontend uses.

**Vercel** → UAT project → Settings → Environment Variables — add:

| Variable                    | UAT value                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `SUPABASE_URL`              | `https://lgxwseyzoefxggxijatp.supabase.co`                    |
| `SUPABASE_SERVICE_ROLE_KEY` | UAT service_role key from Supabase Dashboard → Settings → API |

Get the service_role key: Supabase Dashboard → Project Settings → API →
**service_role** (secret). **Never** expose this in frontend code.

If these are missing or point to PROD, `/api/feeds` returns 401 Unauthorized
even when logged in (the JWT was issued by a different project).

## Troubleshooting: Login redirects to Join / "Acts like you don't have an account"

If signing in on UAT sends you to the Join wizard instead of Feed, or it "acts
like you don't have an account":

### 1. Check the banner (most likely cause)

- **RED banner:** "UAT — WRONG Supabase: using PROD"  
  UAT is pointing at the PROD Supabase project. Your auth session is for PROD,
  but your profile was created on UAT (or vice versa). Profile fetch returns
  null → app sends you to Join.
- **Fix:** Apply Fix 1 or Fix 2 above so UAT uses
  `https://lgxwseyzoefxggxijatp.supabase.co`.
- **YELLOW banner:** "UAT — This is a test environment" — config is correct.

### 2. Redirect URL

UAT Supabase must have `https://webdev-uat.vercel.app/auth/callback` in  
**Authentication** → **URL Configuration** → **Redirect URLs**.

### 3. Profile exists

You only go to Feed if you have a profile with `display_name`. First-time
sign-ins on UAT have no profile and correctly go to Join.

### 4. AuthCallback retry

The app retries the profile fetch once after 600ms to handle post-OAuth timing.
Check the browser console for `AuthCallback: profile fetch error` if issues
persist.

## Troubleshooting: Feed returns 401 / API Unauthorized

If you are logged in but `/api/feeds` (or other `/api/*`) returns 401:

1. **Confirm backend env vars**  
   Vercel UAT project must have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   set (see "Backend env" above). If these are missing or point to PROD
   Supabase, the backend cannot validate your UAT JWT.

2. **Redeploy**  
   After adding or changing env vars, trigger a redeploy (e.g. push a commit or
   use Vercel → Deployments → Redeploy).

3. **Network tab**  
   Requests should include `Authorization: Bearer <JWT>`. The JWT was issued by
   the Supabase project in `VITE_SUPABASE_URL`; the backend must use that same
   project for `SUPABASE_URL`.

## Verifying Supabase / RLS

### Check which Supabase project the build uses

- **Banner:** Red = wrong (PROD). Yellow = correct (UAT).
- **Network tab:** When signing in, auth requests should go to
  `lgxwseyzoefxggxijatp.supabase.co`, not `rpcaazmxymymqdejevtb.supabase.co`.

### SQL: Verify profile exists (Supabase Dashboard → SQL Editor)

Run against the **UAT** Supabase project (lgxwseyzoefxggxijatp):

```sql
-- Replace YOUR_EMAIL with the email you sign in with
select p.id, p.email, p.display_name, p.status
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('YOUR_EMAIL');
```

- If no rows: you have no profile on UAT — complete Join.
- If `status = 'pending'` and `display_name` is null: profile is incomplete —
  finish Join.
- If `status = 'approved'` and `display_name` set: you should reach Feed; if
  not, check redirect URL and banner.

### SQL: Verify RLS allows own profile read

```sql
-- Policies that let a user read their own profile
select polname, polcmd, polqual::text
from pg_policies
where tablename = 'profiles'
  and schemaname = 'public';
```

You should see `profiles_user_read_own` with `auth.uid() = id`.

### Supabase CLI (linked to UAT project)

```bash
# Link to UAT (need SUPABASE_ACCESS_TOKEN and DB password)
supabase link --project-ref lgxwseyzoefxggxijatp

# Check which migrations are applied to remote UAT DB
supabase migration list --linked
```

### "Up to date" but schema is wrong

If `migration list --linked` says "Remote database is up to date" but tables,
columns, or RLS are missing:

1. **Confirm you're linked to the right project**  
   UAT: `lgxwseyzoefxggxijatp`, PROD: `rpcaazmxymymqdejevtb`.

2. **Compare schema to migrations:**

   ```bash
   supabase db diff --linked
   ```

   If it reports changes, the remote schema does not match the migrations.

3. **Repair migration history, then push again** (only if safe to re-run):

   ```bash
   # Mark the last migration as reverted (so db push will re-apply it)
   supabase migration repair 20260121180005 --status reverted

   # Re-push
   supabase db push --linked --include-all --include-seed
   ```

4. **Or apply SQL manually**  
   Copy `supabase/migrations/*.sql` (and
   `supabase/scripts/apply-to-supabase.sql` for one-off fixes) into **Supabase
   Dashboard → SQL Editor** and run against the correct project.

5. **GitHub Actions**  
   Verify `SUPABASE_UAT_DB_PASSWORD` / `SUPABASE_PROD_DB_PASSWORD` are set.  
   Workflow logs: Actions → select the run → "Push migrations" step.

## GitHub Actions: Supabase migration secrets

Migrations run in two workflows:

- **vercel-deploy-uat-prod** — on every push to `main` (runs migrations before
  deploy)
- **supabase-deploy-uat-prod** — only when `supabase/migrations/**`,
  `supabase/seed/**`, or `supabase/config.toml` change

### Required secrets (per environment)

| Secret                      | Where to add              | Value                                    |
| --------------------------- | ------------------------- | ---------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`     | Repo secrets or both envs | Supabase Dashboard → Account → New token |
| `SUPABASE_UAT_PROJECT_REF`  | Environment `uat`         | `lgxwseyzoefxggxijatp`                   |
| `SUPABASE_UAT_DB_PASSWORD`  | Environment `uat`         | UAT Postgres password                    |
| `SUPABASE_PROD_PROJECT_REF` | Environment `production`  | `rpcaazmxymymqdejevtb`                   |
| `SUPABASE_PROD_DB_PASSWORD` | Environment `production`  | PROD Postgres password                   |

**Environments:** GitHub → Repo → Settings → Environments → `uat` / `production`
→  
Add as **Environment secrets** (not repository secrets) so UAT and PROD use
the  
correct project refs and passwords.

### Manual trigger (migrations only)

To run migrations without a full deploy:

1. **Actions** → **Supabase Deploy UAT then PROD**
2. **Run workflow** → choose branch (e.g. `main`)
3. Optionally check **Also deploy production** (requires approval)

### Fallback: apply migrations manually

If the GitHub Action keeps failing, apply SQL directly:

1. **Supabase Dashboard** → your project (UAT or PROD) → **SQL Editor**
2. Run in this order:
   - `supabase/migrations/20260121180000_tables.sql`
   - `supabase/migrations/20260121180005_rls.sql`

### Common failures

| Symptom                            | Fix                                                                   |
| ---------------------------------- | --------------------------------------------------------------------- |
| "Missing SUPABASE_ACCESS_TOKEN"    | Create token at supabase.com/dashboard/account/tokens; add to secrets |
| "Missing SUPABASE_UAT_DB_PASSWORD" | Add DB password to `uat` environment secrets                          |
| "relation already exists"          | Migration already applied; or run `supabase migration repair` + push  |
| "permission denied" / auth failure | Verify `SUPABASE_ACCESS_TOKEN` is valid and has project access        |

## See also

- [Docs index](./README.md)
- [Branded auth domains](./BRANDED_AUTH_DOMAINS.md) — Replace `*.supabase.co`
  with `auth-uat.wrdlnkdn.com` / `auth.wrdlnkdn.com`
- [OAuth display name](./auth-oauth-display-name.md) — Google consent screen

<!-- markdownlint-enable MD013 -->
