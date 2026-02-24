# Authentication and Password Requirements

This document defines **user** and **admin** authentication requirements for the
WRDLNKDN platform. It is the source of truth for auth behavior and access
control.

[← Docs index](./README.md)

---

## 1. User Authentication

### 1.1 Method

- **Sign-in:** OAuth only. Users sign in via supported identity providers
  (IdPs), e.g. **Google** and **Microsoft**.
- **No password sign-in:** The platform does not offer email/password sign-in
  for end users. All user authentication is delegated to the configured IdPs.

### 1.2 Requirements

- Users must complete the **Join flow** (Welcome → Identity → Profile → Values →
  Review → Complete) at `/join` before their profile is submitted for
  moderation.
- **Identity step:** User chooses an IdP (e.g. Google or Microsoft) and is
  redirected to that provider; on success, Supabase Auth issues a session (JWT).
- **Session:** The frontend uses the Supabase client and
  `Authorization: Bearer &lt;token&gt;` for API calls. Tokens are managed by
  Supabase Auth (refresh, expiry).

### 1.3 OAuth and Redirects

- OAuth callback URLs must be **allowlisted** (Supabase Dashboard or
  `config.toml` for local). Do not use wildcards in production.
- See [Supabase README](../supabase/README.md) for provider setup (e.g. Azure
  redirect URI, env vars for local).

### 1.4 Route Guard Hydration and Redirect Safety

- Protected member surfaces (for example `/directory`, `/feed`, `/dashboard`)
  use a guard that waits for session hydration before deciding access.
- The onboarding guard must not downgrade an already-validated authenticated
  route to `/join` on transient null session/profile reads during hydration.
- `SIGNED_OUT` auth events are re-verified with `getSession` and
  `refreshSession` before redirecting, to avoid transient false sign-out states
  during token churn.
- If profile reads are briefly unavailable but auth is valid, the current
  protected route remains stable (no flicker-then-redirect behavior).

---

## 2. Admin Access Requirements

Admin access is **explicitly** restricted. Only identities that satisfy the
requirements below may access admin UI and admin API routes.

### 2.1 Source of Truth: Allowlist

- **Table:** `public.admin_allowlist` (Supabase). It has one column used for
  access control: `email` (primary key).
- **Rule:** A user is treated as an admin **only if** their current
  authentication email (from the JWT) matches a row in `admin_allowlist`
  (case-insensitive).
- **Management:** Rows are inserted/removed via SQL or migrations (or future
  admin-management tooling). There is no self-service join flow for admin.

### 2.2 Backend (Node/Express) Admin Check

Admin API routes use a **requireAdmin** middleware. A request is treated as
admin if **either** of the following is true:

1. **Preferred — Supabase JWT + allowlist**

   - Request has `Authorization: Bearer &lt;access_token&gt;`.
   - Token is validated with Supabase Auth (`getUser`).
   - The user’s email is looked up in `admin_allowlist`.
   - If a row exists for that email, the request is admin.

2. **Legacy — Static token**
   - Request has header `x-admin-token: &lt;value&gt;`.
   - Server has non-empty `ADMIN_TOKEN` env var and the header value matches it
     exactly.
   - Use only for backward compatibility or automation; prefer JWT + allowlist.

If neither condition is met, the backend returns `401 Unauthorized` or
`403 Forbidden` (e.g. when the email is not on the allowlist).

### 2.3 Frontend (React) Admin Gate

- **AdminGate** protects admin UI. Before rendering admin pages it:
  1. Ensures the user has a session (if not, admin app can show sign-in).
  2. Calls Supabase RPC **`is_admin()`**.
- **`is_admin()`** (in the database) is a `SECURITY DEFINER` function that
  returns true iff the current JWT’s email is in `public.admin_allowlist`.
- If `is_admin()` returns false, the UI shows a message that the user does not
  have admin access and does not render admin-only content.

### 2.4 Summary

- **Database:** `public.is_admin()` returns true when the current JWT email is
  in `public.admin_allowlist`.
- **Backend API:** `requireAdmin` accepts Bearer JWT (then allowlist check) or
  legacy `x-admin-token` header.
- **Frontend UI:** Admin routes are gated by session plus RPC `is_admin()`.

---

## 3. References

- [Supabase README](../supabase/README.md) — OAuth provider setup, redirect
  allowlist.
- [Platform NFRs](./architecture/platform-nfrs.md) — Operational and security
  constraints.
- [API Layer](./architecture/api-layer.md) — Auth expectations for API calls.
