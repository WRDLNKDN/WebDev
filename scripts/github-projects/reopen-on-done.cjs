/**
 * When a Project v2 item's Status is Done and the linked Issue is closed, reopen the issue.
 * Resolves repo owner/name from the issue so org boards with multi-repo issues work.
 */
module.exports = async ({ github, context, core }) => {
  const item = context.payload.projects_v2_item;
  if (!item?.node_id) {
    core.info('No projects_v2_item.node_id; skipping.');
    return;
  }

  const contentType = String(item.content_type || '').toLowerCase();
  if (contentType !== 'issue') {
    core.info(`Content is not an Issue (${item.content_type}); skipping.`);
    return;
  }

  const query = `query($id: ID!) {
    node(id: $id) {
      ... on ProjectV2Item {
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

  const { node: projectItem } = await github.graphql(query, {
    id: item.node_id,
  });

  if (!projectItem) {
    core.info('Project item not found; skipping.');
    return;
  }

  const values = projectItem.fieldValues?.nodes ?? [];
  let statusName = null;
  for (const v of values) {
    if (
      v.__typename === 'ProjectV2ItemFieldSingleSelectValue' &&
      v.field?.name === 'Status'
    ) {
      statusName = v.name;
      break;
    }
  }

  if (!statusName) {
    core.info('Status is empty; skipping.');
    return;
  }
  const isDone = String(statusName).trim().toLowerCase() === 'done';
  if (!isDone) {
    core.info(`Status is not Done (${statusName}); skipping.`);
    return;
  }

  const issue = projectItem.content;
  if (!issue || issue.__typename !== 'Issue') {
    core.info('No linked Issue on project item; skipping.');
    return;
  }

  const state = String(issue.state || '').toUpperCase();
  if (state !== 'CLOSED') {
    core.info(`Issue #${issue.number} is already ${issue.state}; no action.`);
    return;
  }

  const owner = issue.repository?.owner?.login;
  const repo = issue.repository?.name;
  if (!owner || !repo) {
    core.setFailed(
      'Could not resolve issue repository owner/name from GraphQL.',
    );
    return;
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
};
