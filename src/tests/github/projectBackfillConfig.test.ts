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

  it('prefers workflow inputs when present', async () => {
    const github = { rest: { users: { getByUsername: vi.fn() } } };
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

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toEqual({
      ownerType: 'org',
      ownerLogin: 'WRDLNKDN',
      projectNumber: 7,
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('falls back to repository variables for scheduled runs', async () => {
    process.env.GH_PROJECT_OWNER_TYPE = 'user';
    process.env.GH_PROJECT_OWNER_LOGIN = 'nick';
    process.env.GH_PROJECT_NUMBER = '12';
    const github = { rest: { users: { getByUsername: vi.fn() } } };
    const core = { setFailed: vi.fn() };
    const context = { payload: {} };

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toEqual({
      ownerType: 'user',
      ownerLogin: 'nick',
      projectNumber: 12,
    });
  });

  it('infers owner login and type from the repository payload when vars are absent', async () => {
    process.env.GH_PROJECT_NUMBER = '18';
    const github = { rest: { users: { getByUsername: vi.fn() } } };
    const core = { setFailed: vi.fn() };
    const context = {
      repo: { owner: 'WRDLNKDN', repo: 'WebDev' },
      payload: {
        repository: {
          owner: {
            login: 'WRDLNKDN',
            type: 'Organization',
          },
        },
      },
    };

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toEqual({
      ownerType: 'org',
      ownerLogin: 'WRDLNKDN',
      projectNumber: 18,
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('infers user-owned repository projects too', async () => {
    process.env.GH_PROJECT_NUMBER = '9';
    const github = { rest: { users: { getByUsername: vi.fn() } } };
    const core = { setFailed: vi.fn() };
    const context = {
      repo: { owner: 'nick', repo: 'WebDev' },
      payload: {
        repository: {
          owner: {
            login: 'nick',
            type: 'User',
          },
        },
      },
    };

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toEqual({
      ownerType: 'user',
      ownerLogin: 'nick',
      projectNumber: 9,
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('falls back to the GitHub owner lookup when the payload omits owner type', async () => {
    process.env.GH_PROJECT_NUMBER = '33';
    const github = {
      rest: {
        users: {
          getByUsername: vi
            .fn()
            .mockResolvedValue({ data: { type: 'Organization' } }),
        },
      },
    };
    const core = { setFailed: vi.fn(), info: vi.fn() };
    const context = {
      repo: { owner: 'WRDLNKDN', repo: 'WebDev' },
      payload: {
        repository: {
          owner: {
            login: 'WRDLNKDN',
          },
        },
      },
    };

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toEqual({
      ownerType: 'org',
      ownerLogin: 'WRDLNKDN',
      projectNumber: 33,
    });
    expect(github.rest.users.getByUsername).toHaveBeenCalledWith({
      username: 'WRDLNKDN',
    });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('fails cleanly when required values are missing', async () => {
    const github = { rest: { users: { getByUsername: vi.fn() } } };
    const core = { setFailed: vi.fn() };
    const context = { payload: {} };

    await expect(
      getProjectBackfillConfig(github, context, core),
    ).resolves.toBeNull();
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
