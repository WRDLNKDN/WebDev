# Chat Report Email Notifications

[← Docs index](../README.md)

Moderators receive email when a user submits a report.

## Setup

1. **Database Webhook** (Supabase Dashboard → Database → Webhooks):

   - Create webhook on `chat_reports` table
   - Event: INSERT
   - URL: `https://<project-ref>.supabase.co/functions/v1/notify-report`
   - Headers: `Authorization: Bearer <service_role_key>`

2. **Edge Function** (`supabase/functions/notify-report`):

   - Deploy: `supabase functions deploy notify-report`
   - Set secrets: `MODERATOR_EMAIL`, optionally `RESEND_API_KEY`

3. **Resend integration** (optional):
   - Add `RESEND_API_KEY` to function secrets:
     `supabase secrets set RESEND_API_KEY=re_xxx`
   - Add `MODERATOR_EMAIL`:
     `supabase secrets set MODERATOR_EMAIL=moderators@example.com`
   - Verify sender domain in Resend dashboard

## Fallback

If no webhook is configured, moderators must check `/admin/chat-reports`
periodically.
