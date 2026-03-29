import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runSetEstimateFromSize = require('../../../scripts/github-projects/set-estimate-from-size.cjs');
const runSetPhase1TargetDate = require('../../../scripts/github-projects/set-phase1-target-date.cjs');
const runReopenOnDone = require('../../../scripts/github-projects/reopen-on-done.cjs');

const { syncEstimateFromSize } = runSetEstimateFromSize;
const { syncFromIssueNode } = runSetPhase1TargetDate;
const { reopenIfDone } = runReopenOnDone;

type GraphqlVariables = {
  id?: string;
  input?: {
    projectId: string;
    itemId: string;
    fieldId: string;
    value: { number?: number; date?: string };
  };
};

function makeCore() {
  return {
    info: vi.fn(),
    warning: vi.fn(),
    setFailed: vi.fn(),
  };
}

describe('project v2 automation field access', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('syncs Estimate from Size using fieldValueByName lookups', async () => {
    const github = {
      graphql: vi
        .fn()
        .mockImplementation(async (query: string, vars: GraphqlVariables) => {
          if (query.includes('query($id: ID!)')) {
            expect(vars).toEqual({ id: 'PVT_item_1' });
            return {
              node: {
                id: 'PVT_item_1',
                project: {
                  id: 'PVT_project_1',
                  fields: {
                    nodes: [
                      { id: 'field_size', name: 'Size' },
                      { id: 'field_estimate', name: 'Estimate' },
                    ],
                  },
                },
                sizeValue: {
                  __typename: 'ProjectV2ItemFieldSingleSelectValue',
                  name: 'L',
                },
                estimateValue: null,
              },
            };
          }

          expect(query).toContain('updateProjectV2ItemFieldValue');
          expect(vars.input).toEqual({
            projectId: 'PVT_project_1',
            itemId: 'PVT_item_1',
            fieldId: 'field_estimate',
            value: { number: 5 },
          });
          return {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'PVT_item_1' },
            },
          };
        }),
    };
    const core = makeCore();

    await expect(
      syncEstimateFromSize(
        github,
        core,
        'PVT_item_1',
        {
          projectId: 'PVT_project_1',
          sizeFieldId: 'field_size',
          estimateFieldId: 'field_estimate',
        },
        { XS: 1, S: 2, M: 3, L: 5, XL: 8 },
      ),
    ).resolves.toBe(true);
  });

  it('sets Phase 1 target date only for the configured project item', async () => {
    const github = {
      graphql: vi
        .fn()
        .mockImplementation(async (query: string, vars: GraphqlVariables) => {
          if (query.includes('projectItems(first: 100)')) {
            expect(vars).toEqual({ id: 'ISSUE_node_1' });
            return {
              node: {
                projectItems: {
                  nodes: [
                    {
                      id: 'PVT_item_match',
                      project: {
                        id: 'PVT_project_match',
                        fields: {
                          nodes: [{ id: 'field_target', name: 'Target Date' }],
                        },
                      },
                      targetDateValue: null,
                    },
                    {
                      id: 'PVT_item_other',
                      project: {
                        id: 'PVT_project_other',
                        fields: {
                          nodes: [{ id: 'field_target', name: 'Target Date' }],
                        },
                      },
                      targetDateValue: null,
                    },
                  ],
                },
              },
            };
          }

          expect(query).toContain('updateProjectV2ItemFieldValue');
          expect(vars.input).toEqual({
            projectId: 'PVT_project_match',
            itemId: 'PVT_item_match',
            fieldId: 'field_target',
            value: { date: '2026-04-27' },
          });
          return {
            updateProjectV2ItemFieldValue: {
              projectV2Item: { id: 'PVT_item_match' },
            },
          };
        }),
    };
    const core = makeCore();

    await expect(
      syncFromIssueNode(github, core, 'ISSUE_node_1', {
        targetField: 'Target Date',
        dateIso: '2026-04-27',
        phase1Title: 'Phase 1',
        projectId: 'PVT_project_match',
      }),
    ).resolves.toBe(true);

    expect(github.graphql).toHaveBeenCalledTimes(2);
  });

  it('reopens a closed issue when Status is Done via fieldValueByName', async () => {
    const github = {
      graphql: vi.fn().mockResolvedValue({
        node: {
          id: 'PVT_item_123',
          statusValue: {
            __typename: 'ProjectV2ItemFieldSingleSelectValue',
            name: 'Done',
          },
          content: {
            __typename: 'Issue',
            number: 42,
            state: 'CLOSED',
            repository: {
              name: 'WebDev',
              owner: { login: 'WRDLNKDN' },
            },
          },
        },
      }),
      rest: {
        issues: {
          update: vi.fn().mockResolvedValue({}),
        },
      },
    };
    const core = makeCore();

    await expect(reopenIfDone(github, core, 'PVT_item_123')).resolves.toBe(
      true,
    );

    expect(github.rest.issues.update).toHaveBeenCalledWith({
      owner: 'WRDLNKDN',
      repo: 'WebDev',
      issue_number: 42,
      state: 'open',
    });
  });
});
