/**
 * When a Project v2 item's Status is "In Review", assign the linked Issue to
 * the original creator only. Current assignees are replaced in a single issue
 * update so a non-assignable creator does not partially clear ownership.
 *
 * Triggers:
 * - projects_v2_item (edited)
 * - schedule (backfill all items in a project)
 * - workflow_dispatch (backfill all items in a project)
 */
const forEachProjectV2Item = require('./forEachProjectV2Item.cjs');
const getProjectBackfillConfig = require('./projectBackfillConfig.cjs');
const resolveProjectV2 = require('./resolveProjectV2.cjs');

const IN_REVIEW_STATUS = 'in review';

async function runReassignInReviewToCreator({ github, context, core }) {
  if (context.eventName === 'projects_v2_item') {
    await handleProjectsV2ItemEvent({ github, context, core });
    return;
  }

  if (
    context.eventName === 'schedule' ||
    context.eventName === 'workflow_dispatch'
  ) {
    await handleProjectBackfill({ github, context, core });
    return;
  }

  core.info(`Unsupported event: ${context.eventName}`);
}

module.exports = runReassignInReviewToCreator;

async function handleProjectsV2ItemEvent({ github, context, core }) {
  const itemNodeId = context.payload.projects_v2_item?.node_id;
  if (!itemNodeId) {
    core.info('No projects_v2_item.node_id; skipping.');
    return;
  }

  await syncProjectItemAssignment(github, core, itemNodeId);
}

async function handleProjectBackfill({ github, context, core }) {
  const config = getProjectBackfillConfig(context, core);
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
    async (itemId) => syncProjectItemAssignment(github, core, itemId),
  );

  core.info(`Backfill complete: scanned ${scanned}, updated ${updated}.`);
}

async function syncProjectItemAssignment(github, core, itemNodeId) {
  const item = await fetchProjectItemDetails(github, itemNodeId);
  if (!item?.id) {
    core.info(`Project item ${itemNodeId} not found; skipping.`);
    return false;
  }

  const statusName = getStatusName(item.fieldValues?.nodes ?? []);
  if (!statusName) {
    core.info(`Item ${item.id} has no Status value; skipping.`);
    return false;
  }
  if (statusName.trim().toLowerCase() !== IN_REVIEW_STATUS) {
    core.info(`Item ${item.id} status is "${statusName}"; skipping.`);
    return false;
  }

  const issue = item.content;
  if (issue?.__typename !== 'Issue') {
    core.info(`Item ${item.id} is not linked to an Issue; skipping.`);
    return false;
  }

  const owner = issue.repository?.owner?.login;
  const repo = issue.repository?.name;
  const issueNumber = issue.number;
  const creatorLogin = issue.author?.login;
  if (!owner || !repo || !issueNumber || !creatorLogin) {
    core.info(
      `Issue details are incomplete for item ${item.id}; skipping reassignment.`,
    );
    return false;
  }

  const currentAssignees = (issue.assignees?.nodes ?? [])
    .map((node) => node?.login)
    .filter((login) => typeof login === 'string' && login.trim())
    .sort();

  if (
    currentAssignees.length === 1 &&
    currentAssignees[0].toLowerCase() === creatorLogin.toLowerCase()
  ) {
    core.info(
      `${owner}/${repo}#${issueNumber} is already assigned only to @${creatorLogin}; no change.`,
    );
    return false;
  }

  try {
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      assignees: [creatorLogin],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'Unknown error');
    core.warning(
      `Could not assign ${owner}/${repo}#${issueNumber} to @${creatorLogin}: ${message}`,
    );
    return false;
  }

  core.info(
    `Assigned ${owner}/${repo}#${issueNumber} to original creator @${creatorLogin} and removed other assignees.`,
  );
  return true;
}

async function fetchProjectItemDetails(github, itemNodeId) {
  const query = `query($id: ID!) {
    node(id: $id) {
      ... on ProjectV2Item {
        id
        fieldValues(first: 30) {
          nodes {
            __typename
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
            }
          }
        }
        content {
          __typename
          ... on Issue {
            number
            author {
              login
            }
            assignees(first: 20) {
              nodes {
                login
              }
            }
            repository {
              name
              owner {
                login
              }
            }
          }
        }
      }
    }
  }`;

  const result = await github.graphql(query, { id: itemNodeId });
  return result.node ?? null;
}

function getStatusName(fieldValues) {
  for (const value of fieldValues) {
    if (
      value?.__typename === 'ProjectV2ItemFieldSingleSelectValue' &&
      value.field?.name === 'Status'
    ) {
      return value.name ?? null;
    }
  }
  return null;
}
