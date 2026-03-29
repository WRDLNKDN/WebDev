/**
 * Project v2 field selections aligned with GitHub's GraphQL examples (inline
 * fragments on unions). See:
 * https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions
 */
module.exports = {
  /** Use under `fields(first: n) { nodes { ... } }` on ProjectV2 */
  fieldsNodesSelection: `
    __typename
    ... on ProjectV2Field { id name }
    ... on ProjectV2SingleSelectField { id name }
    ... on ProjectV2IterationField { id name }
  `,
  /** Use under `field { ... }` on ProjectV2ItemField*Value types */
  fieldConfigSelection: `
    ... on ProjectV2Field { id name }
    ... on ProjectV2SingleSelectField { id name }
    ... on ProjectV2IterationField { id name }
  `,
};
