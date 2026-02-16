# UAT vs PROD Deployment & Supabase

## Environments

- **UAT:** webdev-uat.vercel.app → lgxwseyzoefxggxijatp.supabase.co
- **PROD:** wrdlnkdn.vercel.app → rpcaazmxymymqdejevtb.supabase.co

## Problem: UAT Sign-in Shows PROD Supabase URL

If Google's "Choose an account" dialog shows `rpcaazmxymymqdejevtb.supabase.co`
when signing in on webdev-uat.vercel.app, UAT is using the wrong Supabase.

## Fix (GitHub Actions Deployment)

The workflow uses GitHub secrets. Ensure:

1. **GitHub** → Repo → Settings → Secrets and variables → Actions
2. **SUPABASE_UAT_URL** = `https://lgxwseyzoefxggxijatp.supabase.co`
3. **SUPABASE_UAT_ANON_KEY** = anon key from UAT Supabase project

If SUPABASE_UAT_URL was set to the PROD URL, fix it and re-run the deploy.

The workflow now fails if UAT uses the PROD Supabase project ID.

## Fix (Vercel Dashboard Deployment)

If UAT is deployed via Vercel's native Git integration (not GitHub Actions):

1. **Vercel** → UAT project → Settings → Environment Variables
2. **VITE_SUPABASE_URL** (Preview and/or Production) =
   `https://lgxwseyzoefxggxijatp.supabase.co`
3. **VITE_SUPABASE_ANON_KEY** = UAT anon key
4. Redeploy (trigger a new deployment to pick up changes)

## Verification

After deploying, sign in on UAT. The Google dialog should show:

`to continue to lgxwseyzoefxggxijatp.supabase.co`
