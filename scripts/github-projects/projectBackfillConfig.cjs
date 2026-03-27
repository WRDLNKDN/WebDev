/**
 * Shared config reader for GitHub Project v2 backfill workflows.
 * Supports workflow_dispatch inputs and repository variables for scheduled runs.
 */
module.exports = function getProjectBackfillConfig(context, core) {
  const inputs = context.payload.inputs || {};
  const ownerType =
    inputs.owner_type || process.env.GH_PROJECT_OWNER_TYPE || '';
  const ownerLogin =
    inputs.owner_login || process.env.GH_PROJECT_OWNER_LOGIN || '';
  const projectNumber = Number(
    inputs.project_number || process.env.GH_PROJECT_NUMBER,
  );

  if (ownerType !== 'org' && ownerType !== 'user') {
    core.setFailed(
      'owner_type is required and must be "org" or "user". For scheduled runs, set GH_PROJECT_OWNER_TYPE.',
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
