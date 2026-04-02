import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PACKAGE_JSON = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
};
const RESET_SCRIPT = readFileSync('scripts/supabase-reset.sh', 'utf8');

describe('supabase reset script governance', () => {
  it('routes package.json through the repo reset helper', () => {
    expect(PACKAGE_JSON.scripts?.['supabase:reset']).toBe(
      'bash ./scripts/supabase-reset.sh',
    );
  });

  it('pins the latest CLI and uses the DB-only reset flow', () => {
    expect(RESET_SCRIPT).toContain('SUPABASE_DB_ONLY=true');
    expect(RESET_SCRIPT).toContain('npx supabase@latest db reset');
  });

  it('recovers from the transient storage gateway 502 after reset', () => {
    expect(RESET_SCRIPT).toContain('SUPABASE_DB_ONLY=true');
    expect(RESET_SCRIPT).toContain('storage/v1/bucket');
    expect(RESET_SCRIPT).toContain('docker restart "$kong_container"');
    expect(RESET_SCRIPT).toContain('"$code" != "502"');
    expect(RESET_SCRIPT).toContain(
      'Error status 502: An invalid response was received from the upstream server',
    );
  });
});
