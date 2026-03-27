/**
 * Shared Project v2 item fetch for automations that only need Status plus a
 * linked Issue payload.
 */
async function fetchProjectItemWithIssue(github, itemNodeId, issueSelection) {
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
            ${issueSelection}
          }
        }
      }
    }
  }`;

  const result = await github.graphql(query, { id: itemNodeId });
  return result.node ?? null;
}

function getSingleSelectFieldName(fieldValues, fieldName) {
  for (const value of fieldValues ?? []) {
    if (
      value?.__typename === 'ProjectV2ItemFieldSingleSelectValue' &&
      value.field?.name === fieldName
    ) {
      return value.name ?? null;
    }
  }

  return null;
}

module.exports = {
  fetchProjectItemWithIssue,
  getSingleSelectFieldName,
};
