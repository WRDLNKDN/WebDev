/**
 * When a Project v2 item's Status is Done and the linked Issue is closed,
 * reopen the issue. Resolves repo owner/name from the issue so org boards with
 * multi-repo issues work.
 *
 * Triggers:
 * - schedule (scan all items in a project)
 * - workflow_dispatch (scan all items in a project)
 */
const forEachProjectV2Item = require('./forEachProjectV2Item.cjs');
const { fieldConfigSelection } = require('./projectV2GraphqlFragments.cjs');
const getProjectBackfillConfig = require('./projectBackfillConfig.cjs');
const resolveProjectV2 = require('./resolveProjectV2.cjs');

async function reopenIssueWhenDoneProjectItem({ github, context, core }) {
  if (
    context.eventName !== 'schedule' &&
    context.eventName !== 'workflow_dispatch'
  ) {
    core.info(`Unsupported event: ${context.eventName}`);
    return;
  }

  const config = await getProjectBackfillConfig(github, context, core);
  if (!config) {
    return;
  }

  const project = await resolveProjectV2(github, config);
  if (!project?.id) {
    core.setFailed(
      `Project not found for ${config.ownerType} ${config.ownerLogin} #${config.projectNumber}`,
    );
    return;
  }

  const { scanned, updated } = await forEachProjectV2Item(
    github,
    project.id,
    async (itemId) => reopenIfDone(github, core, itemId),
  );

  core.info(`Backfill complete: scanned ${scanned}, updated ${updated}.`);
}

module.exports = reopenIssueWhenDoneProjectItem;

async function reopenIfDone(github, core, itemNodeId) {
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
                ${fieldConfigSelection}
              }
            }
          }
        }
        content {
          __typename
          ... on Issue {
            number
            state
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

  const { node: projectItem } = await github.graphql(query, { id: itemNodeId });

  if (!projectItem?.id) {
    core.info(`Project item ${itemNodeId} not found; skipping.`);
    return false;
  }

  const values = projectItem.fieldValues?.nodes ?? [];
  let statusName = null;
  for (const value of values) {
    if (
      value?.__typename === 'ProjectV2ItemFieldSingleSelectValue' &&
      value.field?.name === 'Status'
    ) {
      statusName = value.name;
      break;
    }
  }

  if (!statusName) {
    core.info(`Item ${projectItem.id} has no Status value; skipping.`);
    return false;
  }
  if (String(statusName).trim().toLowerCase() !== 'done') {
    core.info(`Item ${projectItem.id} status is "${statusName}"; skipping.`);
    return false;
  }

  const issue = projectItem.content;
  if (issue?.__typename !== 'Issue') {
    core.info(`Item ${projectItem.id} is not linked to an Issue; skipping.`);
    return false;
  }

  const state = String(issue.state || '').toUpperCase();
  if (state !== 'CLOSED') {
    core.info(`Issue #${issue.number} is already ${issue.state}; no action.`);
    return false;
  }

  const owner = issue.repository?.owner?.login;
  const repo = issue.repository?.name;
  if (!owner || !repo) {
    core.setFailed(
      'Could not resolve issue repository owner/name from GraphQL.',
    );
    return false;
  }

  await github.rest.issues.update({
    owner,
    repo,
    issue_number: issue.number,
    state: 'open',
  });

  core.info(
    `Reopened ${owner}/${repo}#${issue.number} (Status is Done while issue was closed).`,
  );
  return true;
}
