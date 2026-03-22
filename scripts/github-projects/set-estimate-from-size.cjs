/**
 * GitHub Actions (actions/github-script) entry: sync Project v2 "Estimate" from "Size".
 * CommonJS (.cjs) so this file works under the repo root "type": "module".
 * Loaded via require(); github-script passes { github, context, core }.
 */
module.exports = async ({ github, context, core }) => {
  const SIZE_TO_ESTIMATE = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

  if (context.eventName === 'projects_v2_item') {
    const itemNodeId = context.payload.projects_v2_item?.node_id;
    if (!itemNodeId) {
      core.info('No projects_v2_item.node_id; skipping.');
      return;
    }
    await syncEstimateFromSize(github, core, itemNodeId, null, SIZE_TO_ESTIMATE);
    return;
  }

  if (context.eventName === 'workflow_dispatch') {
    const inputs = context.payload.inputs || {};
    const ownerType = inputs.owner_type;
    const ownerLogin = inputs.owner_login;
    const projectNumber = Number(inputs.project_number);

    if (!ownerLogin || !Number.isFinite(projectNumber)) {
      core.setFailed('owner_login and project_number are required.');
      return;
    }

    const projectQuery =
      ownerType === 'user'
        ? `query($login: String!, $number: Int!) {
            user(login: $login) {
              projectV2(number: $number) {
                id
                fields(first: 50) {
                  nodes {
                    __typename
                    ... on ProjectV2FieldCommon { id name }
                  }
                }
              }
            }
          }`
        : `query($login: String!, $number: Int!) {
            organization(login: $login) {
              projectV2(number: $number) {
                id
                fields(first: 50) {
                  nodes {
                    __typename
                    ... on ProjectV2FieldCommon { id name }
                  }
                }
              }
            }
          }`;

    const root = await github.graphql(projectQuery, {
      login: ownerLogin,
      number: projectNumber,
    });

    const project =
      ownerType === 'user' ? root.user?.projectV2 : root.organization?.projectV2;

    if (!project?.id) {
      core.setFailed(
        `Project not found for ${ownerType} ${ownerLogin} #${projectNumber}`,
      );
      return;
    }

    const fieldNodes = project.fields?.nodes ?? [];
    const sizeFieldId = fieldNodes.find((f) => f?.name === 'Size')?.id;
    const estimateFieldId = fieldNodes.find((f) => f?.name === 'Estimate')?.id;

    if (!sizeFieldId || !estimateFieldId) {
      core.setFailed('Project must define "Size" and "Estimate" fields.');
      return;
    }

    let cursor = null;
    let updated = 0;
    let scanned = 0;

    for (;;) {
      const page = await github.graphql(
        `query($projectId: ID!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 100, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes { id }
              }
            }
          }
        }`,
        { projectId: project.id, after: cursor },
      );

      const conn = page.node.items;
      const nodes = conn.nodes ?? [];

      for (const item of nodes) {
        scanned += 1;
        const changed = await syncEstimateFromSize(
          github,
          core,
          item.id,
          {
            projectId: project.id,
            sizeFieldId,
            estimateFieldId,
          },
          SIZE_TO_ESTIMATE,
        );
        if (changed) updated += 1;
      }

      if (!conn.pageInfo?.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    core.info(`Backfill complete: scanned ${scanned}, updated ${updated}.`);
    return;
  }

  core.info(`Unsupported event: ${context.eventName}`);
};

async function syncEstimateFromSize(
  github,
  core,
  itemNodeId,
  preloaded,
  sizeToEstimate,
) {
  const itemQuery = `query($id: ID!) {
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
        fieldValues(first: 30) {
          nodes {
            __typename
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              field {
                ... on ProjectV2FieldCommon { id name }
              }
            }
            ... on ProjectV2ItemFieldNumberValue {
              number
              field {
                ... on ProjectV2FieldCommon { id name }
              }
            }
          }
        }
      }
    }
  }`;

  const { node: item } = await github.graphql(itemQuery, { id: itemNodeId });

  if (!item?.id || !item.project?.id) {
    core.info('Item or project missing; skipping.');
    return false;
  }

  const fieldNodes = item.project.fields?.nodes ?? [];
  const sizeFieldId =
    preloaded?.sizeFieldId ?? fieldNodes.find((f) => f?.name === 'Size')?.id;
  const estimateFieldId =
    preloaded?.estimateFieldId ??
    fieldNodes.find((f) => f?.name === 'Estimate')?.id;

  if (!sizeFieldId || !estimateFieldId) {
    core.info('Size or Estimate field not found on project; skipping.');
    return false;
  }

  const values = item.fieldValues?.nodes ?? [];
  let sizeName = null;
  let currentEstimate = null;

  for (const v of values) {
    if (
      v.__typename === 'ProjectV2ItemFieldSingleSelectValue' &&
      v.field?.name === 'Size'
    ) {
      sizeName = v.name;
    }
    if (
      v.__typename === 'ProjectV2ItemFieldNumberValue' &&
      v.field?.name === 'Estimate'
    ) {
      currentEstimate = v.number;
    }
  }

  if (!sizeName) {
    core.info('Size is empty; nothing to map.');
    return false;
  }

  const mapped = sizeToEstimate[String(sizeName).trim().toUpperCase()];
  if (mapped === undefined) {
    core.info(`Size "${sizeName}" is not in XS/S/M/L/XL; skipping.`);
    return false;
  }

  if (
    currentEstimate !== null &&
    currentEstimate !== undefined &&
    Number(currentEstimate) === mapped
  ) {
    core.info(`Estimate already ${mapped}; no update.`);
    return false;
  }

  const projectId = preloaded?.projectId ?? item.project.id;

  await github.graphql(
    `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item { id }
      }
    }`,
    {
      input: {
        projectId,
        itemId: item.id,
        fieldId: estimateFieldId,
        value: { number: mapped },
      },
    },
  );

  core.info(`Set Estimate to ${mapped} for Size ${sizeName}.`);
  return true;
}
