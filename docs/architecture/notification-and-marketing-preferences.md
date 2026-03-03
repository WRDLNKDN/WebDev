# Notification and Marketing Preferences

This doc defines how outbound notification emails and marketing communications
must respect user preferences stored on `profiles`.

## Profile fields

- **`email_notifications_enabled`** (boolean, default true) — When false, do not
  send non-critical account activity emails to this user.
- **`push_enabled`** (boolean, default false) — User has opted in to push
  notifications (browser permission + preference).
- **`marketing_opt_in`** (boolean, default false) — When false, do not send
  marketing emails.
- **`marketing_push_enabled`** (boolean, default false) — When false, do not
  send marketing push notifications.
- **`consent_updated_at`** (timestamptz) — Set when user changes marketing or
  consent-related preferences; useful for auditing.

## Notification emails (non-critical)

**Applies to:** Comments, reactions, mentions, connection requests.

Before sending any **non-critical** notification email to a recipient:

1. Load the recipient's profile and read `email_notifications_enabled`.
2. If `email_notifications_enabled === false`, do **not** send the email.

**Critical emails must always be sent** and must not be gated by this flag:

- Password reset
- Security alerts (e.g. new device, suspicious activity)
- Account verification (e.g. email verification)

Implementation note: When adding a notification-email pipeline (e.g. Supabase
Edge Function on `notifications` insert, or cron that batches unread
notifications), query `profiles.email_notifications_enabled` for the recipient
and skip dispatch when false. Avoid N+1 by batching recipient IDs and fetching
preferences in one query.

## Marketing communications

Before sending **marketing email** to a user:

1. Check `profiles.marketing_opt_in`.
2. If `marketing_opt_in === false`, do **not** send.

Before sending **marketing push notification** to a user:

1. Check `profiles.marketing_push_enabled`.
2. If `marketing_push_enabled === false`, do **not** send.

Marketing must not affect:

- Password reset, security alerts, account verification
- Non-marketing account activity (those are gated by
  `email_notifications_enabled` as above)

When the user changes marketing or consent preferences, update
`consent_updated_at` (e.g. to `now()`) for auditability.

## Push notifications (non-marketing)

When sending **account activity push** (e.g. new comment, reaction, connection
request):

1. Check `profiles.push_enabled` for the recipient.
2. If `push_enabled === false`, do not send push (in-app notification is still
   created).

Push delivery requires service worker registration and a push backend (e.g.
Supabase or a push provider); preference is stored in Settings → Notifications.
