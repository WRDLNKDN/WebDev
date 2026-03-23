/**
 * Paginate all items in a Project v2 board (100 per page).
 * `github` is the graphql client from actions/github-script.
 * `onItem` receives each item node id; return true to increment `updated`.
 */
module.exports = async function forEachProjectV2Item(
  github,
  projectId,
  onItem,
) {
  let cursor = null;
  let scanned = 0;
  let updated = 0;

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
      { projectId, after: cursor },
    );

    const conn = page.node?.items;
    const nodes = conn?.nodes ?? [];

    for (const row of nodes) {
      scanned += 1;
      const changed = await onItem(row.id);
      if (changed) updated += 1;
    }

    if (!conn?.pageInfo?.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  return { scanned, updated };
};
