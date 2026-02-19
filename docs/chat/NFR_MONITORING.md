# NFR: Monitoring & Observability for Chat

[← Docs index](../README.md)

## Supabase Dashboard

- **Database:** Metrics → connections, CPU, storage growth
- **Storage:** Bucket usage for `chat-attachments`
- **Logs:** API logs, Postgres logs, Auth logs

## Alerts to Configure

1. **Postgres health:** High CPU, connection exhaustion
2. **Storage growth:** `chat-attachments` bucket size
3. **Backup failures:** Daily backup status
4. **Error rate:** Spike in 5xx from Supabase API

## Application-Level

- **Rate limit hits:** `chat_rate_limit_check` raises; log via `chat_audit_log`
  or application metrics
- **Report volume:** Monitor `chat_reports` open count
- **Realtime:** Supabase Realtime connections (Realtime dashboard)

## 90-Day Audit Retention

- `chat_audit_log` — prune rows older than 90 days

### Option A: Edge Function (recommended)

1. Deploy: `supabase functions deploy prune-chat-audit-log`
2. Schedule via Supabase cron or external scheduler (e.g. GitHub Actions, Vercel
   Cron) to call the function URL daily

### Option B: pg_cron (Supabase Pro)

```sql
select cron.schedule(
  'prune-chat-audit',
  '0 3 * * *',  -- daily at 03:00 UTC
  $$select public.chat_prune_audit_log()$$
);
```

### Option C: Manual

```sql
select public.chat_prune_audit_log();
```
