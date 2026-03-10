import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TABLES_SQL = readFileSync(
  'supabase/migrations/20260121180000_tables.sql',
  'utf8',
);

const FIX_SQL = readFileSync(
  'supabase/migrations/20260308123000_fix_directory_industry_filter_logic.sql',
  'utf8',
);

function assertColumnSpecificIndustryFilters(sql: string): void {
  expect(sql).toMatch(
    /\(pr\.primary_industry_q is null or p\.industry = pr\.primary_industry_q\)/,
  );
  expect(sql).toMatch(
    /\(pr\.secondary_industry_q is null or p\.secondary_industry = pr\.secondary_industry_q\)/,
  );
  expect(sql).toMatch(
    /\(pr\.primary_industry_q is null or p\.industry = pr\.primary_industry_q\)\s*and\s*\(pr\.secondary_industry_q is null or p\.secondary_industry = pr\.secondary_industry_q\)/,
  );

  // Guard against old permissive logic where each filter matched both columns.
  expect(sql).not.toMatch(
    /p\.industry = pr\.secondary_industry_q|p\.secondary_industry = pr\.primary_industry_q/,
  );
}

describe('directory industry filter logic governance', () => {
  it('uses strict column-specific matching in base tables migration', () => {
    assertColumnSpecificIndustryFilters(TABLES_SQL);
  });

  it('uses strict column-specific matching in forward fix migration', () => {
    assertColumnSpecificIndustryFilters(FIX_SQL);
  });
});
