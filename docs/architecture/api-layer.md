<!-- markdownlint-disable MD013 MD060 -->

# API Layer: WRDLNKDN Frontend ⇄ Backend

[← Docs index](../README.md)

Version: v1 (draft, implementation-ready)

This document is the source of truth for currently implemented API surfaces.
Planned and target contracts live in
[api-layer-planned.md](./api-layer-planned.md).

## Implemented APIs (MVP)

The following APIs are implemented and deployed:

| Surface          | Endpoints                                                                       | Auth                       | Doc                                                                     |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| Feeds            | GET/POST `/api/feeds`, reactions, comments                                      | Bearer JWT                 | [feeds-api.md](../feeds-api.md)                                         |
| Directory        | GET `/api/directory`, connect/accept/decline/disconnect                         | Bearer JWT                 | [directory.md](../directory.md)                                         |
| Admin profiles   | GET/POST profiles (approve, reject, disable, delete)                            | Bearer JWT / x-admin-token | backend README                                                          |
| Weirdling        | generate, regenerate, save, me, delete                                          | Bearer JWT                 | weirdling architecture                                                  |
| Auth/me          | GET `/api/me`                                                                   | Bearer JWT                 | [Planned §1.1](./api-layer-planned.md#11-get-apime)                     |
| Content          | POST `/api/content/submissions`, POST `/api/content/uploads/url`                | Bearer JWT                 | [Planned §3](./api-layer-planned.md#3-content-submission-apis)          |
| Public playlists | GET `/api/public/playlists`, GET `/api/public/playlists/:slug/items`            | None                       | [Planned §2](./api-layer-planned.md#2-public-playlist-and-content-apis) |
| Admin content    | GET `/api/admin/content/submissions`, approve, reject, request-changes, publish | requireAdmin               | [Planned §4](./api-layer-planned.md#4-moderation-and-publishing-apis)   |
| Admin playlists  | GET/POST `/api/admin/playlists`                                                 | requireAdmin               | backend README                                                          |
| Audit            | GET `/api/admin/audit`                                                          | requireAdmin               | [Planned §5](./api-layer-planned.md#5-admin-management-apis)            |

Auth: all authenticated endpoints expect `Authorization: Bearer <token>`.

## Notes

- Feeds and Directory responses follow `{ data, nextCursor? }` and `{ error }`
  patterns.
- Admin APIs use JSON payloads compatible with the target envelope in the
  planned contracts.
- RLS and `requireAuth` / `requireAdmin` enforce privileges.
- Service-role usage is limited to approved admin flows.

## Definition Of Done

Core API endpoints are implemented and deployed, frontend is integrated,
production secrets are not exposed, and contract decisions are documented.
