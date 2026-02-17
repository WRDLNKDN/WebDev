<!-- markdownlint-disable MD013 MD060 -->

# Branded Authentication Domains

[← Docs index](./README.md)

## Summary

Replace Supabase project hash domains (`*.supabase.co`) with branded WRDLNKDN
authentication domains in UAT and Production. End users should never see
`lgxwseyzoefxggxijatp.supabase.co` or `rpcaazmxymymqdejevtb.supabase.co` during
OAuth flows.

## Target State

| Environment | Current (supabase.co)              | Target (branded)        |
| ----------- | ---------------------------------- | ----------------------- |
| UAT         | `lgxwseyzoefxggxijatp.supabase.co` | `auth-uat.wrdlnkdn.com` |
| PROD        | `rpcaazmxymymqdejevtb.supabase.co` | `auth.wrdlnkdn.com`     |

## Prerequisites

- [ ] SSL certificates (Supabase provides these when custom domain is verified)
- [ ] DNS control for `wrdlnkdn.com`

---

## Step 1: Supabase Dashboard – Custom Domain

### UAT Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → UAT project
2. **Project Settings** → **Custom Domains** (or **Authentication** → **URL
   Configuration**)
3. Add custom domain: `auth-uat.wrdlnkdn.com`
4. Note the CNAME target Supabase provides (e.g.
   `lgxwseyzoefxggxijatp.supabase.co` or a specific custom-domain target)
5. Complete domain verification when prompted

### PROD Project

1. Same project → PROD project
2. Add custom domain: `auth.wrdlnkdn.com`
3. Note the CNAME target
4. Complete verification

> **Note:**
> [Supabase custom domain docs](https://supabase.com/docs/guides/platform/custom-domains)

---

## Step 2: DNS Records

Create these records at your DNS provider:

| Type  | Name     | Value                | TTL |
| ----- | -------- | -------------------- | --- |
| CNAME | auth-uat | (from Supabase UAT)  | 300 |
| CNAME | auth     | (from Supabase PROD) | 300 |

- `auth-uat.wrdlnkdn.com` → UAT Supabase custom domain target
- `auth.wrdlnkdn.com` → PROD Supabase custom domain target

---

## Step 3: OAuth Provider Redirect URIs

### Google Cloud Console

1. **APIs & Services** → **Credentials** → OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, add:
   - `https://auth-uat.wrdlnkdn.com/auth/v1/callback` (UAT)
   - `https://auth.wrdlnkdn.com/auth/v1/callback` (PROD)
3. Keep existing `*.supabase.co` URIs until migration is verified, then remove

### Microsoft Azure App Registration

1. **App registrations** → your app → **Authentication**
2. Under **Redirect URIs**, add:
   - `https://auth-uat.wrdlnkdn.com/auth/v1/callback`
   - `https://auth.wrdlnkdn.com/auth/v1/callback`
3. Save

---

## Step 4: Supabase Auth Settings

### Redirect allowlist (Supabase Dashboard)

Ensure **Authentication** → **URL Configuration** → **Redirect URLs** includes:

- `https://webdev-uat.vercel.app/auth/callback`
- `https://wrdlnkdn.com/auth/callback` (or your PROD app domain)
- `http://localhost:5173/auth/callback` (dev)

These are your **app** callback URLs. The custom domain affects the **Supabase**
callback URL users hit during OAuth (Google → Supabase → your app).

---

## Step 5: Update Vercel / GitHub Secrets

After custom domains are active and verified:

### GitHub Actions secrets

- **SUPABASE_UAT_URL** = `https://auth-uat.wrdlnkdn.com`
- **SUPABASE_PROD_URL** = `https://auth.wrdlnkdn.com`

### Vercel Environment Variables

For **UAT** project:

- **VITE_SUPABASE_URL** = `https://auth-uat.wrdlnkdn.com`
- **VITE_SUPABASE_ANON_KEY** = (unchanged)

For **PROD** project:

- **VITE_SUPABASE_URL** = `https://auth.wrdlnkdn.com`
- **VITE_SUPABASE_ANON_KEY** = (unchanged)

---

## Step 6: Update Workflow Validation (`.github/workflows/vercel-deploy-uat-prod.yml`)

After migration, update the validation steps that check for
`lgxwseyzoefxggxijatp` and `rpcaazmxymymqdejevtb` to instead validate:

- UAT: `auth-uat.wrdlnkdn.com`
- PROD: `auth.wrdlnkdn.com`

---

## Verification Checklist

- [ ] OAuth sign-in on UAT shows `auth-uat.wrdlnkdn.com` (not
      `lgxwseyzoefxggxijatp.supabase.co`)
- [ ] OAuth sign-in on PROD shows `auth.wrdlnkdn.com` (not
      `rpcaazmxymymqdejevtb.supabase.co`)
- [ ] Google authentication succeeds
- [ ] Microsoft authentication succeeds
- [ ] Session persists across page refresh
- [ ] No regression in login or token handling
- [ ] Verified in Chrome, Firefox, Safari, mobile

---

## Local Development

Local dev continues to use `http://127.0.0.1:54321` (or
`http://localhost:54321`). No branded domain needed for local Supabase.

---

## Rollback

If issues occur, revert GitHub/Vercel env vars to the original `*.supabase.co`
URLs and redeploy. OAuth providers can keep both redirect URIs during the
transition.

<!-- markdownlint-enable MD013 MD060 -->
