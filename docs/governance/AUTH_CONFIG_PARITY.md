# UAT and PROD Auth Configuration Parity

**Epic:** API & Data Layer Governance  
**Date:** 2026-02-14

---

## Checklist: OAuth Configuration

| Item                     | UAT                                  | PROD                                  | Notes                                                |
| ------------------------ | ------------------------------------ | ------------------------------------- | ---------------------------------------------------- |
| Redirect URLs            |                                      |                                       | Must include exact callback URL per environment      |
| Callback URL (Supabase)  | `https://<uat-domain>/auth/callback` | `https://<prod-domain>/auth/callback` | Set in Supabase Dashboard → Auth → URL Configuration |
| Site URL                 | `https://webdev-uat.vercel.app`      | `https://wrdlnkdn.vercel.app`         |                                                      |
| Additional Redirect URLs | Add all valid origins                | Add all valid origins                 | No cross-environment leakage                         |

### Redirect URL Patterns

**UAT (webdev-uat.vercel.app):**

```text
https://webdev-uat.vercel.app/auth/callback
https://webdev-uat.vercel.app
```

**PROD (wrdlnkdn.vercel.app):**

```text
https://wrdlnkdn.vercel.app/auth/callback
https://wrdlnkdn.com/auth/callback  # if canonical domain differs
https://wrdlnkdn.vercel.app
```

**Local:**

```text
http://localhost:5173/auth/callback
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:54321/auth/v1/callback  # Supabase local Auth
```

---

## Environment Variables

| Variable                        | UAT                    | PROD                   | Used By              |
| ------------------------------- | ---------------------- | ---------------------- | -------------------- |
| `VITE_SUPABASE_URL`             | UAT project API URL    | PROD project API URL   | Frontend             |
| `VITE_SUPABASE_ANON_KEY`        | UAT anon key           | PROD anon key          | Frontend             |
| `SUPABASE_URL`                  | Same as VITE\_ for API | Same as VITE\_ for API | Backend              |
| `SUPABASE_SERVICE_ROLE_KEY`     | UAT service_role       | PROD service_role      | Backend              |
| `SUPABASE_GOOGLE_CLIENT_ID`     | Same or separate       | Same or separate       | supabase/config.toml |
| `SUPABASE_GOOGLE_CLIENT_SECRET` | Same or separate       | Same or separate       | supabase/config.toml |
| `SUPABASE_AZURE_CLIENT_ID`      | Same or separate       | Same or separate       | supabase/config.toml |
| `SUPABASE_AZURE_CLIENT_SECRET`  | Same or separate       | Same or separate       | supabase/config.toml |

**Rule:** UAT and PROD must use **different** Supabase projects. Never use PROD
keys in UAT or vice versa.

---

## Supabase Project Settings

1. **Auth → Providers:** Enable same providers (Google, Azure) in both UAT and
   PROD.
2. **Auth → URL Configuration:**
   - Site URL: environment-specific
   - Redirect URLs: exact list per environment (no wildcards for production)
3. **Auth → Email:** Same templates; different "from" domains if desired.
4. **Database:** Same migrations applied; data is separate.

---

## Verification Steps

1. Sign in via Google on UAT → should redirect to UAT callback → no redirect
   loop.
2. Sign in via Google on PROD → should redirect to PROD callback → no redirect
   loop.
3. Copy UAT session cookie to PROD request → must fail (different project).
4. Check CORS: UAT backend allows UAT frontend origin only; PROD backend allows
   PROD frontend origin.
