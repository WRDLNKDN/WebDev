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

- `chat_audit_log` — prune rows older than 90 days via scheduled job or Edge
  Function
- Example cron:

  ```sql
  DELETE FROM chat_audit_log WHERE created_at < now() - interval '90 days'
  ```
