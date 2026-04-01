/**
 * Shared config reader for GitHub Project v2 backfill workflows.
 * Supports workflow_dispatch inputs plus workflow-provided env for scheduled runs.
 */
function trimStr(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeOwnerType(value) {
  const normalized = trimStr(value).toLowerCase();
  if (normalized === 'org' || normalized === 'organization') {
    return 'org';
  }
  if (normalized === 'user' || normalized === 'person') {
    return 'user';
  }
  return '';
}

function parseProjectUrl(url) {
  const trimmed = trimStr(url);
  if (!trimmed) return {};

  const match =
    /^https?:\/\/[^/]+\/(orgs|users)\/([^/]+)\/projects\/(\d+)(?:\/|$)/i.exec(
      trimmed,
    );
  if (!match) return {};

  return {
    ownerType: match[1].toLowerCase() === 'orgs' ? 'org' : 'user',
    ownerLogin: match[2],
    projectNumber: Number.parseInt(match[3], 10),
  };
}

module.exports = async function getProjectBackfillConfig(
  github,
  context,
  core,
) {
  const inputs = context.payload.inputs || {};
  const repositoryOwner = context.payload.repository?.owner;
  const urlFallback = parseProjectUrl(process.env.GH_PROJECT_URL);
  let ownerLogin = trimStr(
    inputs.owner_login ||
      process.env.GH_PROJECT_OWNER_LOGIN ||
      urlFallback.ownerLogin ||
      repositoryOwner?.login ||
      context.repo?.owner ||
      '',
  );

  let ownerType = normalizeOwnerType(
    inputs.owner_type ||
      process.env.GH_PROJECT_OWNER_TYPE ||
      urlFallback.ownerType,
  );

  const repoOwnerMatchesLogin = repositoryOwner?.login
    ? repositoryOwner.login.localeCompare(ownerLogin, undefined, {
        sensitivity: 'accent',
        usage: 'search',
      }) === 0
    : false;

  /**
   * REST GET /users/{username} returns both Users and Organizations (type field).
   * GraphQL Project v2 requires user() vs organization() — a wrong GH_PROJECT_OWNER_TYPE
   * (e.g. "user" for an org login) causes "Could not resolve to a User". Prefer API truth.
   */
  if (ownerLogin && github?.rest?.users?.getByUsername) {
    try {
      const res = await github.rest.users.getByUsername({
        username: ownerLogin,
      });
      const data = res?.data;
      const fromApi = normalizeOwnerType(data?.type);
      if (fromApi) {
        if (
          ownerType &&
          ownerType !== fromApi &&
          typeof core.info === 'function'
        ) {
          core.info(
            `GH_PROJECT_OWNER_TYPE was "${ownerType}" but GitHub reports "${data?.type}" for ${ownerLogin}; using "${fromApi}" for Project v2 GraphQL.`,
          );
        }
        ownerType = fromApi;
      }
    } catch (error) {
      if (typeof core.info === 'function') {
        core.info(
          `Could not resolve ${ownerLogin} via users.getByUsername (${String(
            error?.message ?? error,
          )}); will use env/repo fallbacks if any.`,
        );
      }
    }
  }

  if (!ownerType && repoOwnerMatchesLogin) {
    ownerType = normalizeOwnerType(repositoryOwner?.type);
  }

  if (!ownerType) {
    ownerType = normalizeOwnerType(context.repo?.owner ?? '');
  }
  const rawProject =
    inputs.project_number != null && String(inputs.project_number).trim() !== ''
      ? inputs.project_number
      : (process.env.GH_PROJECT_NUMBER ?? urlFallback.projectNumber);
  const projectNumber = Number(trimStr(rawProject));

  if (ownerType !== 'org' && ownerType !== 'user') {
    core.setFailed(
      'owner_type is required and must be "org" or "user". For scheduled runs, provide GH_PROJECT_OWNER_TYPE through the workflow env, or run from a repository owned by that project owner.',
    );
    return null;
  }
  if (!ownerLogin || !Number.isFinite(projectNumber) || projectNumber < 1) {
    core.setFailed(
      'owner_login and project_number are required. For scheduled runs, provide GH_PROJECT_OWNER_LOGIN and GH_PROJECT_NUMBER through the workflow env.',
    );
    return null;
  }

  const config = {
    ownerType,
    ownerLogin,
    projectNumber,
  };
  if (typeof core?.info === 'function') {
    core.info(
      `Project config → ownerType=${ownerType}, ownerLogin=${ownerLogin}, projectNumber=${projectNumber}`,
    );
  }
  return config;
};
