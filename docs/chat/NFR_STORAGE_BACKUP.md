# NFR: Storage & Backup for Chat (Supabase)

[← Docs index](../README.md)

## Storage

- **Chat attachments:** Supabase Storage bucket `chat-attachments`
  - 6MB per file limit
  - Allowed types: jpg, png, webp, gif, pdf, doc, docx, txt
  - Private bucket; access via signed URLs (RLS enforces authenticated)
  - Path structure: `{user_id}/{timestamp}_{index}.{ext}`

## Backup

Supabase managed backups (Pro tier):

- **Daily full backup** — automatic
- **Hourly incremental** — automatic (Point-in-Time Recovery)
- Retention: 7 days (default); configurable

Self-hosted / local:

- `supabase db dump` for manual exports
- Schedule daily pg_dump via cron

## Operations

1. Enable backups in Supabase Dashboard → Settings → Database
2. Test restore: `supabase db reset` (local) or PITR restore (cloud)
3. Chat tables included: `chat_rooms`, `chat_room_members`, `chat_messages`,
   `chat_message_reactions`, `chat_message_attachments`, `chat_read_receipts`,
   `chat_reports`, `chat_blocks`, `chat_suspensions`, `chat_audit_log`
