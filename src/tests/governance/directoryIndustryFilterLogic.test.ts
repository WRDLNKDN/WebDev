import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TABLES_SQL = readFileSync(
  'supabase/migrations/20260121180000_tables.sql',
  'utf8',
);

function assertColumnSpecificIndustryFilters(sql: string): void {
  expect(sql).toMatch(
    /\(pr\.primary_industry_q is null or p\.industry = pr\.primary_industry_q or p\.secondary_industry = pr\.primary_industry_q/,
  );
  expect(sql).toMatch(
    /\(pr\.secondary_industry_q is null or p\.industry = pr\.secondary_industry_q or p\.secondary_industry = pr\.secondary_industry_q/,
  );
  expect(sql).toMatch(
    /jsonb_array_elements\(p\.industries\).*g->>'industry'.*pr\.primary_industry_q/s,
  );
  expect(sql).not.toMatch(
    /p\.industry = pr\.primary_industry_q\s+and\s+p\.industry = pr\.secondary_industry_q/,
  );
}

describe('directory industry filter logic governance', () => {
  it('uses strict column-specific matching in base tables migration', () => {
    assertColumnSpecificIndustryFilters(TABLES_SQL);
  });
});
