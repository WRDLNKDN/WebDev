/**
 * Sets Project v2 "Target Date" to 2026-04-27 when the linked Issue milestone is "Phase 1"
 * and Target Date is blank. Does not overwrite an existing Target Date.
 *
 * Triggers:
 * - issues (opened, edited, milestoned)
 * - schedule (scan all items in a project)
 * - workflow_dispatch (scan all items in a project)
 *
 * If GITHUB_TOKEN cannot write the project, add a fine-grained PAT with project write as
 * secret PROJECT_PHASE1_TARGET_DATE_TOKEN (same pattern as set-estimate-from-size).
 */
const forEachProjectV2Item = require('./forEachProjectV2Item.cjs');
const getProjectBackfillConfig = require('./projectBackfillConfig.cjs');
const resolveProjectV2 = require('./resolveProjectV2.cjs');

const PHASE1_TITLE = 'Phase 1';
const TARGET_FIELD = 'Target Date';
const DATE_ISO = '2026-04-27';

async function handleIssuesPhase1Target({ github, context, core }) {
  const issue = context.payload.issue;
  if (!issue?.node_id) {
    core.info('No issue node_id; skipping.');
    return;
  }
  const mTitle = issue.milestone?.title?.trim();
  if (mTitle !== PHASE1_TITLE) {
    core.info(
      `Milestone is not "${PHASE1_TITLE}" (${mTitle ?? 'none'}); skipping.`,
    );
    return;
  }
  await syncFromIssueNode(github, core, issue.node_id, {
    targetField: TARGET_FIELD,
    dateIso: DATE_ISO,
    phase1Title: PHASE1_TITLE,
  });
}

async function handleWorkflowDispatchPhase1Backfill({ github, context, core }) {
  const config = await getProjectBackfillConfig(github, context, core);
  if (!config) {
    return;
  }
  const project = await resolveProjectV2(github, config);
  const projectId = project?.id;

  if (!projectId) {
    core.setFailed(
      `Project not found for ${config.ownerType} ${config.ownerLogin} #${config.projectNumber}`,
    );
    return;
  }

  const { scanned, updated } = await forEachProjectV2Item(
    github,
    projectId,
    async (itemId) =>
      syncFromProjectItemNode(github, core, itemId, {
        targetField: TARGET_FIELD,
        dateIso: DATE_ISO,
        phase1Title: PHASE1_TITLE,
      }),
  );

  core.info(`Backfill complete: scanned ${scanned}, updated ${updated}.`);
}

async function runSetPhase1TargetDate({ github, context, core }) {
  if (context.eventName === 'issues') {
    await handleIssuesPhase1Target({ github, context, core });
    return;
  }

  if (
    context.eventName === 'workflow_dispatch' ||
    context.eventName === 'schedule'
  ) {
    await handleWorkflowDispatchPhase1Backfill({ github, context, core });
    return;
  }

  core.info(`Unsupported event: ${context.eventName}`);
}

module.exports = runSetPhase1TargetDate;

/**
 * @returns {Promise<boolean>} true if a field value was written
 */
async function syncFromIssueNode(github, core, issueNodeId, opts) {
  const query = `query($id: ID!) {
    node(id: $id) {
      ... on Issue {
        projectItems(first: 30) {
          nodes {
            id
            project {
              id
              fields(first: 50) {
                nodes {
                  __typename
                  ... on ProjectV2FieldCommon { id name }
                }
              }
            }
            fieldValues(first: 40) {
              nodes {
                __typename
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon { id name }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;

  const { node } = await github.graphql(query, { id: issueNodeId });
  const items = node?.projectItems?.nodes ?? [];
  if (items.length === 0) {
    core.info('Issue has no project items; nothing to update.');
    return false;
  }

  let any = false;
  for (const item of items) {
    const wrote = await maybeSetTargetDateOnItem(github, core, item, opts);
    if (wrote) any = true;
  }
  return any;
}

/**
 * @returns {Promise<boolean>} true if a field value was written
 */
async function syncFromProjectItemNode(github, core, itemNodeId, opts) {
  const query = `query($id: ID!) {
    node(id: $id) {
      ... on ProjectV2Item {
        id
        project {
          id
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2FieldCommon { id name }
            }
          }
        }
        fieldValues(first: 40) {
          nodes {
            __typename
            ... on ProjectV2ItemFieldDateValue {
              date
              field {
                ... on ProjectV2FieldCommon { id name }
              }
            }
          }
        }
        content {
          __typename
          ... on Issue {
            number
            milestone {
              title
            }
          }
        }
      }
    }
  }`;

  const { node: item } = await github.graphql(query, { id: itemNodeId });

  if (!item?.id || !item.project?.id) {
    core.info('Project item or project missing; skipping.');
    return false;
  }

  const content = item.content;
  if (!content || content.__typename !== 'Issue') {
    core.info('Project item is not linked to an Issue; skipping.');
    return false;
  }

  const mTitle = content.milestone?.title?.trim();
  if (mTitle !== opts.phase1Title) {
    core.info(
      `Issue #${content.number} milestone is not "${opts.phase1Title}" (${mTitle ?? 'none'}); skipping.`,
    );
    return false;
  }

  return maybeSetTargetDateOnItem(github, core, item, opts);
}

function targetDateIsBlank(dateVal) {
  if (dateVal === null || dateVal === undefined) return true;
  if (typeof dateVal === 'string' && dateVal.trim() === '') return true;
  return false;
}

/**
 * @returns {Promise<boolean>}
 */
async function maybeSetTargetDateOnItem(github, core, item, opts) {
  const fieldNodes = item.project?.fields?.nodes ?? [];
  const targetFieldId = fieldNodes.find(
    (f) => f?.name === opts.targetField,
  )?.id;

  if (!targetFieldId) {
    core.info(
      `Project ${item.project?.id ?? 'unknown'} has no "${opts.targetField}" field; skipping item ${item.id}.`,
    );
    return false;
  }

  const values = item.fieldValues?.nodes ?? [];
  let currentDate = null;
  let sawDateField = false;

  for (const v of values) {
    if (
      v.__typename === 'ProjectV2ItemFieldDateValue' &&
      v.field?.name === opts.targetField
    ) {
      sawDateField = true;
      currentDate = v.date;
      break;
    }
  }

  if (!targetDateIsBlank(currentDate)) {
    core.info(
      `Item ${item.id} already has ${opts.targetField}=${currentDate}; no update.`,
    );
    return false;
  }

  if (!sawDateField && values.length > 0) {
    core.info(
      `Item ${item.id}: no ${opts.targetField} value node (treating as blank); setting ${opts.dateIso}.`,
    );
  }

  await github.graphql(
    `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item { id }
      }
    }`,
    {
      input: {
        projectId: item.project.id,
        itemId: item.id,
        fieldId: targetFieldId,
        value: { date: opts.dateIso },
      },
    },
  );

  core.info(`Set ${opts.targetField} to ${opts.dateIso} on item ${item.id}.`);
  return true;
}
