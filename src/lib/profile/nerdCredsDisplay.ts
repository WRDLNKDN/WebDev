import type { NerdCreds } from '../../types/profile';

type CredsLike = NerdCreds | Record<string, unknown>;

/** Resume thumbnail / file fields from `nerd_creds` (or equivalent record). */
export function resumeFieldsFromCreds(creds: CredsLike): {
  resumeThumbnailUrl: string | null;
  resumeFileName: string | null;
  resumeThumbnailStatus: 'pending' | 'complete' | 'failed' | null;
} {
  const r = creds as Record<string, unknown>;
  const resumeThumbnailUrl =
    typeof r.resume_thumbnail_url === 'string' ? r.resume_thumbnail_url : null;
  const resumeFileName =
    typeof r.resume_file_name === 'string' ? r.resume_file_name : null;
  const resumeThumbnailStatus =
    r.resume_thumbnail_status === 'pending' ||
    r.resume_thumbnail_status === 'complete' ||
    r.resume_thumbnail_status === 'failed'
      ? (r.resume_thumbnail_status as 'pending' | 'complete' | 'failed')
      : null;
  return { resumeThumbnailUrl, resumeFileName, resumeThumbnailStatus };
}

/** Normalized skills list for profile identity / landing (array or comma string). */
export function selectedSkillsFromCredsInput(creds: CredsLike): string[] {
  const r = creds as Record<string, unknown>;
  if (Array.isArray(r.skills)) {
    return r.skills.map((skill) => String(skill).trim()).filter(Boolean);
  }
  if (typeof r.skills === 'string') {
    return r.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
}

/** Normalized interests list for profile identity / landing. */
export function selectedInterestsFromCredsInput(creds: CredsLike): string[] {
  const r = creds as Record<string, unknown>;
  if (Array.isArray(r.interests)) {
    return r.interests.map((i) => String(i).trim()).filter(Boolean);
  }
  if (typeof r.interests === 'string') {
    return r.interests
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
  }
  return [];
}
