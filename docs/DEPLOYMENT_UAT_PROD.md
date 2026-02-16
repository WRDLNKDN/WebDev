# UAT vs PROD Deployment & Supabase

[← Docs index](./README.md)

## Environments

- **UAT:** [webdev-uat.vercel.app](https://webdev-uat.vercel.app/) →
  `lgxwseyzoefxggxijatp.supabase.co`
- **PROD:** [wrdlnkdn.vercel.app](https://wrdlnkdn.vercel.app/) →
  `rpcaazmxymymqdejevtb.supabase.co`

## Problem: UAT Sign-in Shows PROD Supabase

If the Google "Choose an account" dialog shows
`rpcaazmxymymqdejevtb.supabase.co` when signing in on webdev-uat.vercel.app, UAT
is using the wrong Supabase.

A red banner will show on webdev-uat.vercel.app when this is detected.

## Root cause

webdev-uat.vercel.app is the **Production** domain of the UAT project. The build
that reaches it can come from:

1. **Vercel auto-deploy** (Git push) — uses env vars from Vercel Dashboard
2. **GitHub Actions** — uses `SUPABASE_UAT_URL` / `SUPABASE_UAT_ANON_KEY`
   secrets

If Vercel auto-deploys first with wrong env vars, the Production domain gets the
wrong build.

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

## Verification

After deploying, sign in on UAT. The Google dialog should show:

`to continue to lgxwseyzoefxggxijatp.supabase.co`

## See also

- [Docs index](./README.md)
- [OAuth display name](./auth-oauth-display-name.md) — Google consent screen
