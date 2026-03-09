<!-- markdownlint-disable MD013 MD060 -->

# Epic: API Layer (Frontend–Backend Secure Communication)

[← Docs index](../README.md)

**Type:** Epic  
**Area:** Architecture / API / Security

This epic covers the design and implementation of the API layer required for
secure, scalable communication between the frontend (Vercel) and the backend
(Supabase). The goal is to support authentication, content submission,
moderation, playlist curation, and public content consumption while enforcing
strong security, role-based access, and clean separation of client and server
responsibilities.

---

## 1. Business Value

- Enables safe community content contribution at scale
- Protects production data through clear privilege boundaries
- Supports moderation and governance workflows aligned with community values
- Establishes a durable API foundation for future product growth

---

## 2. In Scope

- Frontend-to-backend API contracts for all core user and admin workflows
- Authentication and authorization enforcement
- Content submission and moderation workflows
- Playlist and content retrieval for public viewing
- Secure file upload handling for raw video submissions
- Observability, logging, and audit trails for privileged actions

---

## 3. Out of Scope

- Rebuilding commerce or storefront logic
- Performance or load testing beyond basic pagination and response time
  expectations
- Third-party platform behavior (YouTube, Ecwid, Printful)

---

## 4. Epic Acceptance Criteria

| Criterion                                        | Status | Notes                                        |
| ------------------------------------------------ | ------ | -------------------------------------------- |
| Documented API contract covering required flows  | ✅     | [api-layer.md](./api-layer.md)               |
| Auth/authorization via RLS and role checks       | ✅     | Bearer JWT, requireAuth, requireAdmin        |
| Privileged actions server-side with service role | ✅     | Admin routes use adminSupabase               |
| Public content endpoints return approved only    | ✅     | Public playlists return only published items |
| Content submission: YouTube + upload             | ✅     | POST /api/content/submissions, uploads/url   |
| Moderation: approve, reject, request changes     | ✅     | Admin content moderation APIs                |
| Playlist management restricted to admin          | ✅     | Admin playlists CRUD; publish requires admin |
| Audit logging for privileged operations          | ✅     | audit_log for content actions                |
| Consistent response envelope                     | ✅     | `{ ok, data, error, meta }`                  |
| API documentation available                      | ✅     | api-layer.md, feeds-api.md, directory.md     |
| No production secrets exposed to client          | ✅     | Env-specific keys, server-side admin         |

---

## 5. Implemented vs Planned

### Implemented (MVP)

- **Feeds:** GET/POST `/api/feeds`, reactions, comments — Bearer JWT
- **Directory:** GET `/api/directory`, connect/accept/decline/disconnect —
  Bearer JWT
- **Admin profiles:** GET/POST profiles (approve, reject, disable, delete) —
  Bearer JWT / x-admin-token
- **Weirdling:** generate, regenerate, save, me, delete — Bearer JWT
- **Auth/me:** GET `/api/me` — Bearer JWT
- **Content submission:** POST `/api/content/submissions`, POST
  `/api/content/uploads/url` — Bearer JWT
- **Public playlists:** GET `/api/public/playlists`, GET
  `/api/public/playlists/:slug/items` — Public
- **Admin content:** GET `/api/admin/content/submissions`, approve, reject,
  request-changes, publish — requireAdmin
- **Admin playlists:** GET/POST `/api/admin/playlists` — requireAdmin
- **Audit:** GET `/api/admin/audit` — requireAdmin

See [api-layer.md](./api-layer.md) for full contracts.

---

## 6. Definition of Done

- [x] Core API endpoints implemented and deployed (feeds, directory, admin)
- [x] Content submission, moderation, playlists, and audit APIs implemented
- [x] Frontend integrated with the API layer
- [x] Test users can submit, moderate, and publish content end to end
- [x] No production secrets exposed to the client
- [x] Architecture and API decisions documented and shared

---

## 7. Related Docs

- [API Layer (Technical Spec)](./api-layer.md)
- [Feeds API](../feeds-api.md)
- [Directory](../directory.md)
- [IA Baseline](./ia-baseline.md)
