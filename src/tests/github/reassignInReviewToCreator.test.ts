import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runReassignInReviewToCreator = require('../../../scripts/github-projects/reassign-in-review-to-creator.cjs');

function makeCore() {
  return {
    info: vi.fn(),
    warning: vi.fn(),
    setFailed: vi.fn(),
  };
}

function makeGithubForItem(item: unknown) {
  return {
    graphql: vi.fn().mockResolvedValue({ node: item }),
    rest: {
      issues: {
        update: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

function makeProjectIssueItem(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'PVT_item_123',
    fieldValues: {
      nodes: [
        {
          __typename: 'ProjectV2ItemFieldSingleSelectValue',
          name: 'In Review',
          field: { name: 'Status' },
        },
      ],
    },
    content: {
      __typename: 'Issue',
      number: 42,
      author: { login: 'originator' },
      assignees: {
        nodes: [{ login: 'dev-a' }, { login: 'qa-user' }],
      },
      repository: {
        name: 'WebDev',
        owner: { login: 'WRDLNKDN' },
      },
    },
    ...overrides,
  };
}

describe('reassign-in-review-to-creator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reassigns an in-review issue to the original creator only', async () => {
    const github = makeGithubForItem(makeProjectIssueItem());
    const core = makeCore();
    const context = {
      eventName: 'projects_v2_item',
      payload: {
        projects_v2_item: {
          node_id: 'PVT_item_123',
        },
      },
    };

    await runReassignInReviewToCreator({ github, context, core });

    expect(github.rest.issues.update).toHaveBeenCalledWith({
      owner: 'WRDLNKDN',
      repo: 'WebDev',
      issue_number: 42,
      assignees: ['originator'],
    });
    expect(core.warning).not.toHaveBeenCalled();
  });

  it('does nothing when status is not In Review', async () => {
    const github = makeGithubForItem(
      makeProjectIssueItem({
        fieldValues: {
          nodes: [
            {
              __typename: 'ProjectV2ItemFieldSingleSelectValue',
              name: 'In Progress',
              field: { name: 'Status' },
            },
          ],
        },
      }),
    );
    const core = makeCore();
    const context = {
      eventName: 'projects_v2_item',
      payload: {
        projects_v2_item: {
          node_id: 'PVT_item_123',
        },
      },
    };

    await runReassignInReviewToCreator({ github, context, core });

    expect(github.rest.issues.update).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      'Item PVT_item_123 status is "In Progress"; skipping.',
    );
  });

  it('does nothing when the creator is already the only assignee', async () => {
    const github = makeGithubForItem(
      makeProjectIssueItem({
        content: {
          __typename: 'Issue',
          number: 42,
          author: { login: 'originator' },
          assignees: {
            nodes: [{ login: 'originator' }],
          },
          repository: {
            name: 'WebDev',
            owner: { login: 'WRDLNKDN' },
          },
        },
      }),
    );
    const core = makeCore();
    const context = {
      eventName: 'projects_v2_item',
      payload: {
        projects_v2_item: {
          node_id: 'PVT_item_123',
        },
      },
    };

    await runReassignInReviewToCreator({ github, context, core });

    expect(github.rest.issues.update).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      'WRDLNKDN/WebDev#42 is already assigned only to @originator; no change.',
    );
  });

  it('logs a warning and preserves state when the creator is not assignable', async () => {
    const github = makeGithubForItem(makeProjectIssueItem());
    github.rest.issues.update.mockRejectedValueOnce(
      new Error('Could not resolve to a User with the login of "originator".'),
    );
    const core = makeCore();
    const context = {
      eventName: 'projects_v2_item',
      payload: {
        projects_v2_item: {
          node_id: 'PVT_item_123',
        },
      },
    };

    await runReassignInReviewToCreator({ github, context, core });

    expect(core.warning).toHaveBeenCalledWith(
      'Could not assign WRDLNKDN/WebDev#42 to @originator: Could not resolve to a User with the login of "originator".',
    );
  });
});
