import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const getProjectBackfillConfig = require('../../../scripts/github-projects/projectBackfillConfig.cjs');
const resolveProjectV2 = require('../../../scripts/github-projects/resolveProjectV2.cjs');

describe('projectBackfillConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GH_PROJECT_OWNER_TYPE;
    delete process.env.GH_PROJECT_OWNER_LOGIN;
    delete process.env.GH_PROJECT_NUMBER;
  });

  it('prefers workflow inputs when present', () => {
    const core = { setFailed: vi.fn() };
    const context = {
      payload: {
        inputs: {
          owner_type: 'org',
          owner_login: 'WRDLNKDN',
          project_number: '7',
        },
      },
    };

    expect(getProjectBackfillConfig(context, core)).toEqual({
      ownerType: 'org',
      ownerLogin: 'WRDLNKDN',
      projectNumber: 7,
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('falls back to repository variables for scheduled runs', () => {
    process.env.GH_PROJECT_OWNER_TYPE = 'user';
    process.env.GH_PROJECT_OWNER_LOGIN = 'nick';
    process.env.GH_PROJECT_NUMBER = '12';
    const core = { setFailed: vi.fn() };
    const context = { payload: {} };

    expect(getProjectBackfillConfig(context, core)).toEqual({
      ownerType: 'user',
      ownerLogin: 'nick',
      projectNumber: 12,
    });
  });

  it('fails cleanly when required values are missing', () => {
    const core = { setFailed: vi.fn() };
    const context = { payload: {} };

    expect(getProjectBackfillConfig(context, core)).toBeNull();
    expect(core.setFailed).toHaveBeenCalled();
  });
});

describe('resolveProjectV2', () => {
  it('resolves org-owned projects', async () => {
    const github = {
      graphql: vi.fn().mockResolvedValue({
        organization: { projectV2: { id: 'PVT_org_1' } },
      }),
    };

    await expect(
      resolveProjectV2(github, {
        ownerType: 'org',
        ownerLogin: 'WRDLNKDN',
        projectNumber: 5,
      }),
    ).resolves.toEqual({ id: 'PVT_org_1' });
  });

  it('resolves user-owned projects with fields when requested', async () => {
    const github = {
      graphql: vi.fn().mockResolvedValue({
        user: {
          projectV2: {
            id: 'PVT_user_1',
            fields: { nodes: [{ id: 'field_1', name: 'Status' }] },
          },
        },
      }),
    };

    await expect(
      resolveProjectV2(github, {
        ownerType: 'user',
        ownerLogin: 'nick',
        projectNumber: 2,
        includeFields: true,
      }),
    ).resolves.toEqual({
      id: 'PVT_user_1',
      fields: { nodes: [{ id: 'field_1', name: 'Status' }] },
    });
  });
});
