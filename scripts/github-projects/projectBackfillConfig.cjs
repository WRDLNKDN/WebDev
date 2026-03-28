/**
 * Shared config reader for GitHub Project v2 backfill workflows.
 * Supports workflow_dispatch inputs and repository variables for scheduled runs.
 */
module.exports = async function getProjectBackfillConfig(github, context, core) {
  const inputs = context.payload.inputs || {};
  const repositoryOwner = context.payload.repository?.owner;
  let inferredOwnerType =
    repositoryOwner?.type === 'Organization'
      ? 'org'
      : repositoryOwner?.type === 'User'
        ? 'user'
        : '';
  const ownerLogin =
    inputs.owner_login ||
    process.env.GH_PROJECT_OWNER_LOGIN ||
    repositoryOwner?.login ||
    context.repo?.owner ||
    '';
  if (!inferredOwnerType && ownerLogin && github?.rest?.users?.getByUsername) {
    try {
      const { data } = await github.rest.users.getByUsername({
        username: ownerLogin,
      });
      inferredOwnerType =
        data?.type === 'Organization'
          ? 'org'
          : data?.type === 'User'
            ? 'user'
            : '';
    } catch (error) {
      if (typeof core.info === 'function') {
        core.info(
          `Could not infer project owner type for ${ownerLogin}; continuing with configured values only.`,
        );
      }
    }
  }
  const ownerType =
    inputs.owner_type ||
    process.env.GH_PROJECT_OWNER_TYPE ||
    inferredOwnerType ||
    '';
  const projectNumber = Number(
    inputs.project_number || process.env.GH_PROJECT_NUMBER,
  );

  if (ownerType !== 'org' && ownerType !== 'user') {
    core.setFailed(
      'owner_type is required and must be "org" or "user". For scheduled runs, set GH_PROJECT_OWNER_TYPE or run from a repository owned by that project owner.',
    );
    return null;
  }
  if (!ownerLogin || !Number.isFinite(projectNumber)) {
    core.setFailed(
      'owner_login and project_number are required. For scheduled runs, set GH_PROJECT_OWNER_LOGIN and GH_PROJECT_NUMBER repository variables.',
    );
    return null;
  }

  return {
    ownerType,
    ownerLogin,
    projectNumber,
  };
};
