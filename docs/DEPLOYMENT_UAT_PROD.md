<!-- markdownlint-disable MD013 -->

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

## Troubleshooting: Login redirects to Join/Signup

If signing in on UAT sends you to the Join wizard instead of Feed:

1. **Redirect URL** — UAT Supabase must have  
   `https://webdev-uat.vercel.app/auth/callback` in  
   **Authentication** → **URL Configuration** → **Redirect URLs**. If missing,
   OAuth may fail or redirect incorrectly.

2. **Profile exists** — You only go to Feed if you have a profile with
   `display_name`. First-time sign-ins on UAT have no profile and correctly go
   to Join. If you completed Join on UAT before, you should reach Feed.

3. **AuthCallback retry** — The app retries the profile fetch once after 600ms
   to handle post-OAuth timing. Check the browser console for
   `AuthCallback: profile fetch error` if issues persist.

## See also

- [Docs index](./README.md)
- [Branded auth domains](./BRANDED_AUTH_DOMAINS.md) — Replace `*.supabase.co`
  with `auth-uat.wrdlnkdn.com` / `auth.wrdlnkdn.com`
- [OAuth display name](./auth-oauth-display-name.md) — Google consent screen

<!-- markdownlint-enable MD013 -->
