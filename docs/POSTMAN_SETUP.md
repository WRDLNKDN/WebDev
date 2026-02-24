# Postman Setup

This project ships with Postman files for local, UAT, and auto-auth flows.

## Files

- `WebDev.postman_collection.json`
- `WebDev.local.postman_environment.json`
- `WebDev.uat.postman_environment.json`
- `WebDev.auto-auth.postman_collection.json`
- `WebDev.uat.auto-auth.postman_environment.json`

## Quick Start (UAT Auto Auth)

1. Import:
   - `WebDev.auto-auth.postman_collection.json`
   - `WebDev.uat.auto-auth.postman_environment.json`
2. Select environment: `WebDev UAT (Auto Auth)`.
3. Set required environment variables:
   - `baseUrl` = `https://webdev-uat.vercel.app`
   - `supabaseUrl` = `https://<your-project-ref>.supabase.co`
   - `supabaseAnonKey` = UAT anon key
   - `refreshToken` = current session refresh token
4. Run request:
   - `Auth Bootstrap -> Refresh Supabase Session`
5. Confirm Postman now has:
   - `accessToken`
   - `refreshToken` (may rotate)
   - `tokenExpiresAt`
6. Run `Health and Auth -> Me` to validate auth.

## Where to get `refreshToken`

Log in on UAT in Chrome, then run this in DevTools console:

```js
const keys = [
  'uat-sb-wrdlnkdn-auth',
  'prod-sb-wrdlnkdn-auth',
  'dev-sb-wrdlnkdn-auth',
];
const key = keys.find((k) => localStorage.getItem(k));
const raw = key ? localStorage.getItem(key) : null;
const session = raw ? JSON.parse(raw) : null;
console.log('key:', key);
console.log('refreshToken:', session?.refresh_token || '');
console.log('accessToken:', session?.access_token || '');
```

## Notes

- Admin routes still require an admin account. Set `adminToken` only if your
  deployment expects `x-admin-token`.
- If refresh fails with missing variables, ensure `supabaseUrl`,
  `supabaseAnonKey`, and `refreshToken` are set in the selected environment.
