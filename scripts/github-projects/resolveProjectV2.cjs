/**
 * Resolve a Project v2 by owner type/login/number. Optionally include project fields.
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

  const projectQuery =
    ownerType === 'user'
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

  const root = await github.graphql(projectQuery, {
    login: ownerLogin,
    number: projectNumber,
  });

  return ownerType === 'user'
    ? (root.user?.projectV2 ?? null)
    : (root.organization?.projectV2 ?? null);
};
