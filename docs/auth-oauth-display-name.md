# OAuth Sign-in Display Name Investigation

[← Docs index](./README.md)

## Issue

The Google OAuth sign-in screen may show the Supabase project domain (e.g.
`rpcaazmxymymqdejevtb.supabase.co`) instead of the app domain `wrdlnkdn.com`.

## Where This Is Configured

The OAuth consent screen display name is controlled by:

1. **Google Cloud Console** — OAuth consent screen "Application name" and
   "Authorized domains"
2. **Supabase Dashboard** — Auth → Providers → Google; redirect URL uses the
   Supabase project URL for the auth callback
3. **Redirect flow** — User is sent to Google with `redirect_uri`; Google shows
   the app name from the OAuth client configuration

## How to Change It

1. In **Google Cloud Console** → APIs & Services → OAuth consent screen:

   - Set "Application name" to "WRDLNKDN" or "wrdlnkdn.com"
   - Add `wrdlnkdn.com` and
     [webdev-uat.vercel.app](https://webdev-uat.vercel.app/) to Authorized
     domains

2. Ensure the OAuth client "Authorized redirect URIs" include both:

   - `https://<supabase-project>.supabase.co/auth/v1/callback` (required for
     Supabase)
   - Your app's auth callback if using a custom flow

3. The redirect domain (Supabase) cannot be changed—Supabase hosts the auth
   callback. The **Application name** in Google's consent screen is what users
   see; update that to "WRDLNKDN" or "wrdlnkdn.com".

## Constraint

Supabase Auth uses `supabase.co` for the OAuth redirect. The "Sign in with
Google" button cannot show a custom domain for the redirect target. The fix is
to set the Google OAuth consent screen "Application name" so users see your
brand, not the Supabase project ID.

## See also

- [Docs index](./README.md)
- [UAT vs PROD deployment](./DEPLOYMENT_UAT_PROD.md)
