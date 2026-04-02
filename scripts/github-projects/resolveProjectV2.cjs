/**
 * Resolve a Project v2 by owner type/login/number. Optionally include project fields.
 * Retries with the alternate owner root (user vs organization) when GraphQL reports
 * "Could not resolve to a User/Organization" or returns no project for the first query.
 */
const { fieldsNodesSelection } = require('./projectV2GraphqlFragments.cjs');

module.exports = async function resolveProjectV2(
  github,
  { ownerType, ownerLogin, projectNumber, includeFields = false },
) {
  const projectSelection = includeFields
    ? `id
       fields(first: 50) {
         nodes {
           ${fieldsNodesSelection}
         }
       }`
    : 'id';

  const buildQuery = (type) =>
    type === 'user'
      ? `query($login: String!, $number: Int!) {
          user(login: $login) {
            projectV2(number: $number) {
              ${projectSelection}
            }
          }
        }`
      : `query($login: String!, $number: Int!) {
          organization(login: $login) {
            projectV2(number: $number) {
              ${projectSelection}
            }
          }
        }`;

  const pickProject = (root, type) =>
    type === 'user'
      ? (root.user?.projectV2 ?? null)
      : (root.organization?.projectV2 ?? null);

  const vars = { login: ownerLogin, number: projectNumber };

  async function fetchProject(type) {
    const root = await github.graphql(buildQuery(type), vars);
    return pickProject(root, type);
  }

  /** Wrong user/org root often throws; treat as "try another root". */
  async function fetchProjectOrNull(type) {
    try {
      return await fetchProject(type);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (
        /Could not resolve to a User/i.test(msg) ||
        /Could not resolve to an Organization/i.test(msg)
      ) {
        return null;
      }
      throw e;
    }
  }

  let project = await fetchProjectOrNull(ownerType);
  if (project) return project;

  const alt = ownerType === 'user' ? 'org' : 'user';
  project = await fetchProjectOrNull(alt);
  return project;
};
