/**
 * Content API surface exports.
 * Split into modular files to keep each unit small and maintainable.
 */

export type {
  AdminAuthCallbackLog,
  AdminPlaylist,
  AdminResumeThumbnailFailure,
  AdminResumeThumbnailRun,
  AdminResumeThumbnailRunDetails,
  AdminResumeThumbnailSummary,
  ContentSubmissionRow,
  PlaylistItem,
  PublicPlaylist,
  SubmitContentBody,
} from './contentApiTypes';

export {
  fetchAdminAuthCallbackLogs,
  fetchAdminContentSubmissions,
  fetchAdminPlaylists,
  approveContent,
  publishContent,
  rejectContent,
  requestChangesContent,
} from './contentApiAdmin';

export {
  fetchAdminResumeThumbnailFailures,
  fetchAdminResumeThumbnailRunDetails,
  fetchAdminResumeThumbnailRuns,
  fetchAdminResumeThumbnailSummary,
  retryAdminResumeThumbnail,
  runAdminResumeThumbnailBackfill,
} from './contentApiResume';

export {
  fetchPlaylistItems,
  fetchPublicPlaylists,
  getUploadUrl,
  submitContent,
} from './contentApiSubmissions';
