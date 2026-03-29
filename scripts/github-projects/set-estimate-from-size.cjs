/**
 * GitHub Actions (actions/github-script) entry: sync Project v2 "Estimate" from "Size".
 * CommonJS (.cjs) so this file works under the repo root "type": "module".
 * Loaded via require(); github-script passes { github, context, core }.
 */
const forEachProjectV2Item = require('./forEachProjectV2Item.cjs');
const {
  fieldConfigSelection,
  fieldsNodesSelection,
} = require('./projectV2GraphqlFragments.cjs');
const getProjectBackfillConfig = require('./projectBackfillConfig.cjs');
const resolveProjectV2 = require('./resolveProjectV2.cjs');

const SIZE_TO_ESTIMATE = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

async function handleWorkflowDispatchEstimate({ github, context, core }) {
  const config = await getProjectBackfillConfig(github, context, core);
  if (!config) {
    return;
  }
  const project = await resolveProjectV2(github, {
    ...config,
    includeFields: true,
  });

  if (!project?.id) {
    core.setFailed(
      `Project not found for ${config.ownerType} ${config.ownerLogin} #${config.projectNumber}`,
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

  const { scanned, updated } = await forEachProjectV2Item(
    github,
    project.id,
    async (itemId) =>
      syncEstimateFromSize(
        github,
        core,
        itemId,
        {
          projectId: project.id,
          sizeFieldId,
          estimateFieldId,
        },
        SIZE_TO_ESTIMATE,
      ),
  );

  core.info(`Backfill complete: scanned ${scanned}, updated ${updated}.`);
}

async function runSetEstimateFromSize({ github, context, core }) {
  if (
    context.eventName === 'workflow_dispatch' ||
    context.eventName === 'schedule'
  ) {
    await handleWorkflowDispatchEstimate({ github, context, core });
    return;
  }

  core.info(`Unsupported event: ${context.eventName}`);
}

module.exports = runSetEstimateFromSize;

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
              ${fieldsNodesSelection}
            }
          }
        }
        fieldValues(first: 30) {
          nodes {
            __typename
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              field {
                ${fieldConfigSelection}
              }
            }
            ... on ProjectV2ItemFieldNumberValue {
              number
              field {
                ${fieldConfigSelection}
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
