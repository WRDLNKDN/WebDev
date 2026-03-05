import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = 'supabase/migrations';
const REQUIRED_COLUMNS = [
  'push_enabled',
  'email_notifications_enabled',
  'marketing_email_enabled',
  'marketing_opt_in',
  'marketing_opt_in_timestamp',
  'marketing_source',
  'marketing_product_updates',
  'marketing_events',
  'marketing_push_enabled',
  'consent_updated_at',
];

function collectGrantedProfileUpdateColumns(): Set<string> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const combinedSql = files
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))
    .join('\n\n');

  const grants = [
    ...combinedSql.matchAll(
      /grant\s+update\s*\(([\s\S]*?)\)\s*on\s+table\s+public\.profiles\s+to\s+authenticated/gi,
    ),
  ];

  const granted = new Set<string>();
  for (const grant of grants) {
    const columns = grant[1]
      .split(',')
      .map((column) => column.trim().toLowerCase())
      .filter(Boolean);
    for (const column of columns) granted.add(column);
  }
  return granted;
}

describe('profiles preference grants', () => {
  it('keeps required update grants for notification and marketing settings', () => {
    const grantedColumns = collectGrantedProfileUpdateColumns();
    for (const required of REQUIRED_COLUMNS) {
      expect(grantedColumns).toContain(required);
    }
  });
});
