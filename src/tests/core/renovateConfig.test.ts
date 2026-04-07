import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('renovate config', () => {
  const configPath = resolve(process.cwd(), 'renovate.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
    ignoreUnstable?: boolean;
    platformAutomerge?: boolean;
    packageRules?: Array<Record<string, unknown>>;
    vulnerabilityAlerts?: Record<string, unknown>;
  };

  it('ignores unstable releases by default', () => {
    expect(config.ignoreUnstable).toBe(true);
  });

  it('enables platform automerge for safe Renovate PRs', () => {
    expect(config.platformAutomerge).toBe(true);
  });

  it('marks low-risk github-actions updates as safe to automerge', () => {
    const packageRules = config.packageRules ?? [];
    const safeRules = packageRules.filter(
      (rule) =>
        Array.isArray(rule.addLabels) &&
        rule.addLabels.includes('renovate:automerge-safe'),
    );

    expect(
      safeRules.some(
        (rule) =>
          JSON.stringify(rule.matchManagers) ===
            JSON.stringify(['github-actions']) &&
          JSON.stringify(rule.matchUpdateTypes) ===
            JSON.stringify(['patch', 'pin', 'digest']) &&
          rule.automerge === true,
      ),
    ).toBe(true);

    expect(
      safeRules.some(
        (rule) =>
          JSON.stringify(rule.matchManagers) === JSON.stringify(['npm']),
      ),
    ).toBe(false);
  });

  it('auto-merges Renovate vulnerability alert PRs', () => {
    expect(config.vulnerabilityAlerts).toMatchObject({
      enabled: true,
      automerge: true,
      automergeType: 'pr',
    });
  });

  it('pins the TypeScript ecosystem to stable releases only', () => {
    const packageRules = config.packageRules ?? [];
    const typescriptRule = packageRules.find(
      (rule) =>
        rule.description === 'Only allow stable TypeScript ecosystem releases.',
    );

    expect(typescriptRule).toMatchObject({
      matchManagers: ['npm'],
      matchPackageNames: [
        'typescript',
        'typescript-eslint',
        '@typescript-eslint/**',
      ],
      ignoreUnstable: true,
      respectLatest: true,
      allowedVersions: '!/-((alpha|beta|rc|next|canary|dev|insiders?)(\\.|$))/',
    });
  });
});
