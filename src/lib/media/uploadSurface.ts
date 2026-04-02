export const PLATFORM_UPLOAD_SURFACES = [
  'feed_post_image',
  'chat_attachment',
  'profile_avatar',
  'profile_resume',
  'profile_resume_thumbnail',
  'portfolio_source',
  'portfolio_thumbnail',
  'group_image',
] as const;

export type PlatformUploadSurface = (typeof PLATFORM_UPLOAD_SURFACES)[number];
