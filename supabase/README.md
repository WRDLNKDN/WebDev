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

### Azure app: Front-channel logout URL (optional)

In Azure App Registration → **Authentication** → **Settings**:

- **Front-channel logout URL:** Use your app's origin so Microsoft can redirect
  the user there after sign-out at Microsoft. Examples:
  - Production: `https://yourdomain.com` or `https://yourdomain.com/logout` if
    you add a logout route.
  - Local: `http://localhost:5173`
- Your app clears its own session via `supabase.auth.signOut()` when the user
  clicks Sign out; this URL is only where the browser lands after Microsoft's
  logout.

### Azure app: Office 365 / work accounts not working (personal Outlook works)

If **personal** @outlook.com / @hotmail.com work but **work/school**
(Office 365) accounts do not:

1. **Redirect URI in Azure must be Supabase's callback**, not your app's:

   - Production: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Local: `http://localhost:54321/auth/v1/callback`
   - In Azure: **Authentication** → **Redirect URIs** → add the correct one for
     your environment. Do **not** use `https://yourdomain.com/auth/callback` as
     the Azure redirect; that is your app's post-login URL, configured in
     Supabase **Redirect URLs**.

2. **Supported account types:** Must be **"Accounts in any organizational
   directory (Multitenant) and personal Microsoft accounts"**. You already have
   this; if it was "My organization only", personal accounts would fail.

3. **Admin consent (most common for O365):** Many tenants require an **admin to
   consent** to the app before users can sign in. Have your Microsoft 365 /
   Entra admin:

   - Go to **App registrations** → **WRDLNKDN** → **API permissions**
   - Click **Grant admin consent for &lt;tenant&gt;**
   - Users in that tenant can then sign in (or use "Request admin consent" in
     the app if you add that flow).

4. **Publisher verification:** Unverified multitenant apps can be blocked or
   show warnings in some orgs. In **Branding & properties**, add your
   **Publisher verification** (e.g. MPN ID / verified domain) to improve trust
   and reduce blocks.

### AADSTS50020: "User account does not exist in tenant"

If you see: _"User account '<user@other-org.edu>' from identity provider '...'
does not exist in tenant 'Default Directory' and cannot access the
application"_:

- The user is in a **different** Microsoft tenant (e.g. their school/work) than
  the tenant where your app is registered ("Default Directory"). Azure is
  rejecting them because the sign-in request is targeting your app's tenant
  only.

**Fix (hosted Supabase):** Use the **common** authority so any Microsoft tenant
can sign in.

1. Open **Supabase Dashboard** → **Authentication** → **Providers** → **Azure**.
2. Find **"Azure Tenant URL"** (or similar).
3. **Leave it empty** so Supabase uses the default
   `https://login.microsoftonline.com/common`, **or** set it explicitly to
   `https://login.microsoftonline.com/common`.
4. If it is set to a specific tenant ID (e.g.
   `https://login.microsoftonline.com/<your-tenant-id>`), clear it or change it
   to `common`. Saving an empty value restores the default.

Your Azure app's **Supported account types** must still be **"Accounts in any
organizational directory (Multitenant) and personal Microsoft accounts"**. You
don't need to change the manifest for this.

## Security: OAuth redirect URLs

To prevent **open redirect** attacks, OAuth callback URLs must be allowlisted:

- **Hosted Supabase:** In Dashboard → **Authentication** → **URL
  Configuration**, set **Redirect URLs** to your allowed origins only (e.g.
  `https://yourdomain.com/auth/callback`,
  `http://localhost:5173/auth/callback`). Do not use wildcards for production.

- **Local:** `config.toml` and the Auth server restrict redirects; ensure
  `redirectTo` in the app matches your configured site URL / redirect allowlist.
