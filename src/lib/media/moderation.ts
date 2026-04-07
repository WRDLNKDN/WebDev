/**
 * Client helpers for media moderation and safe rendering (status, abuse refs, quarantine).
 * Server resolution and provider hooks: `backend/lib/mediaModeration.js`.
 * Overview: `docs/architecture/MEDIA_MODERATION.md`.
 */
export {
  buildPlatformMediaRenderingReferences,
  isPlatformMediaSafeToRender,
} from './contract';
export type {
  PlatformMediaAbuseReportReference,
  PlatformMediaModerationMetadata,
  PlatformMediaModerationStatus,
} from './contract';
