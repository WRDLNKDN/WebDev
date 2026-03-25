import { authedFetch } from '../../lib/api/authFetch';
import { supabase } from '../../lib/auth/supabaseClient';
import { processAvatarForUpload } from '../../lib/utils/avatarResize';
import { messageFromApiPayload, toMessage } from '../../lib/utils/errors';
import type { DashboardProfile } from '../../types/profile';
import { processResumeThumbnailImageForUpload } from '../../lib/portfolio/processResumeThumbnailImage';
import { getResumeStoragePathFromPublicUrl } from '../../lib/portfolio/resumeStorage';
import {
  API_BASE,
  RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
} from './useProfileHelpers';
import { tryOptimizePdfForUpload } from '../../lib/portfolio/optimizePdfForUpload';
import { resumeSupportsServerThumbnailGeneration } from '../../lib/portfolio/resumePreviewSupport';
import {
  formatResumeOversizeMessage,
  getResumeSoftSizeNote,
  RESUME_MAX_FILE_BYTES,
} from '../../lib/portfolio/resumeUploadLimits';

/** Parse JSON error/success bodies; non-JSON (e.g. HTML proxy error) surfaces as `detail` text. */
async function readApiJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return {
      detail: trimmed.slice(0, 280),
    };
  }
}

/** Returned after storage + profile update; `thumbnailWarning` is non-fatal (file saved). */
export type UploadResumeResult = {
  publicUrl: string;
  thumbnailWarning?: string;
  /** Non-blocking heads-up when the file is near the platform cap. */
  sizeNote?: string;
};

export const uploadAvatarAsset = async ({
  file,
  updateProfile,
}: {
  file: File;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to upload an avatar.');

  const { blob } = await processAvatarForUpload(file);
  const ext =
    blob.type === 'image/png' ? 'png' : (file.name.split('.').pop() ?? 'jpg');
  const fileName = `${session.user.id}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { contentType: blob.type });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName);

  await updateProfile({
    avatar: publicUrl,
    avatar_type: 'photo',
    use_weirdling_avatar: false,
  } as Partial<DashboardProfile>);
  return publicUrl;
};

export const uploadResumeAsset = async ({
  file,
  updateProfile,
  fetchData,
  profile,
}: {
  file: File;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
  fetchData: () => Promise<void>;
  /** When replacing an existing resume, used to remove the prior storage object if the extension changes. */
  profile?: DashboardProfile | null;
}): Promise<UploadResumeResult> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to upload a resume.');

  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!['.pdf', '.doc', '.docx'].includes(ext)) {
    throw new Error(
      'Resume must be a PDF or Word document (.pdf, .doc, or .docx only)',
    );
  }

  const fileToUpload =
    ext === '.pdf' ? await tryOptimizePdfForUpload(file) : file;

  if (fileToUpload.size > RESUME_MAX_FILE_BYTES) {
    throw new Error(formatResumeOversizeMessage(fileToUpload.size));
  }

  const sizeNote = getResumeSoftSizeNote(fileToUpload.size) ?? undefined;

  const normalizedExt = ext.slice(1);
  const isWord = ext === '.doc' || ext === '.docx';
  const fileName = isWord
    ? `${session.user.id}/resume-original.${normalizedExt}`
    : `${session.user.id}/resume.pdf`;
  const originalResumeFileName = file.name?.trim()
    ? file.name.trim()
    : `Resume.${normalizedExt}`;
  const contentType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const uid = session.user.id;
  const previousUrl =
    typeof profile?.resume_url === 'string' ? profile.resume_url : '';
  const previousPath = previousUrl
    ? getResumeStoragePathFromPublicUrl(previousUrl)
    : null;

  const pathsToRemove = new Set<string>();
  if (
    previousPath &&
    previousPath !== fileName &&
    previousPath.startsWith(`${uid}/`)
  ) {
    pathsToRemove.add(previousPath);
  }
  pathsToRemove.add(`${uid}/resume.doc`);
  pathsToRemove.add(`${uid}/resume.docx`);
  if (ext === '.pdf') {
    pathsToRemove.add(`${uid}/resume-original.doc`);
    pathsToRemove.add(`${uid}/resume-original.docx`);
  }
  if (isWord) {
    pathsToRemove.add(`${uid}/resume.pdf`);
  }
  pathsToRemove.delete(fileName);

  if (pathsToRemove.size > 0) {
    const { error: removeError } = await supabase.storage
      .from('resumes')
      .remove([...pathsToRemove]);
    if (removeError) {
      console.warn('[uploadResume] could not remove prior resume objects', {
        paths: [...pathsToRemove],
        message: removeError.message,
      });
    }
  }

  const { error } = await supabase.storage
    .from('resumes')
    .upload(fileName, fileToUpload, { upsert: true, contentType });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('resumes').getPublicUrl(fileName);

  const thumbTargetPending = resumeSupportsServerThumbnailGeneration(
    originalResumeFileName,
    publicUrl,
  );

  await updateProfile({
    ...(isWord ? { resume_url: null } : { resume_url: publicUrl }),
    nerd_creds: {
      resume_file_name: originalResumeFileName,
      resume_original_url: null,
      resume_thumbnail_url: undefined,
      resume_thumbnail_error: null,
      resume_thumbnail_updated_at: undefined,
      resume_thumbnail_source_extension: undefined,
      ...(thumbTargetPending
        ? { resume_thumbnail_status: 'pending' as const }
        : {
            resume_thumbnail_status: 'complete' as const,
          }),
    },
  } as Partial<DashboardProfile>);

  if (thumbTargetPending) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
    );
    try {
      const response = await authedFetch(
        `${API_BASE}/api/resumes/generate-thumbnail`,
        {
          method: 'POST',
          body: JSON.stringify({ storagePath: fileName }),
          signal: controller.signal,
        },
        {
          includeJsonContentType: true,
          credentials: API_BASE ? 'omit' : 'include',
        },
      );
      clearTimeout(timeoutId);
      const payload = (await readApiJsonBody(response)) as
        | {
            ok?: boolean;
            data?: {
              status?: string;
              thumbnailUrl?: string;
              resumePublicUrl?: string;
            };
            error?: string;
            message?: string;
          }
        | undefined;
      if (!response.ok) {
        throw new Error(messageFromApiPayload(response.status, payload));
      }
      await fetchData();
      const resolvedResumeUrl =
        typeof payload?.data?.resumePublicUrl === 'string' &&
        payload.data.resumePublicUrl.length > 0
          ? payload.data.resumePublicUrl
          : publicUrl;
      return { publicUrl: resolvedResumeUrl, sizeNote };
    } catch (thumbnailError) {
      clearTimeout(timeoutId);
      console.warn('Resume thumbnail generation failed:', thumbnailError);
      await fetchData();
      if (
        thumbnailError instanceof Error &&
        thumbnailError.name === 'AbortError'
      ) {
        throw new Error(
          'Preview generation timed out. You can try again from the resume card.',
        );
      }
      const thumbMsg = toMessage(thumbnailError);
      return {
        publicUrl: isWord ? '' : publicUrl,
        thumbnailWarning: `Preview was not generated (${thumbMsg}). Open the resume card and tap Retry preview, or upload a custom preview image.`,
        sizeNote,
      };
    }
  }

  return { publicUrl, sizeNote };
};

const resumeCustomThumbPath = (userId: string) =>
  `${userId}/resume-thumb-custom.jpg`;

export const uploadResumeThumbnailImageAsset = async ({
  file,
  updateProfile,
  profile,
}: {
  file: File;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
  profile: DashboardProfile | null;
}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to update your resume preview.');

  const blob = await processResumeThumbnailImageForUpload(file);
  const thumbPath = resumeCustomThumbPath(session.user.id);
  const { error } = await supabase.storage
    .from('resumes')
    .upload(thumbPath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('resumes').getPublicUrl(thumbPath);

  const creds = profile?.nerd_creds ?? {};
  await updateProfile({
    nerd_creds: {
      ...creds,
      resume_thumbnail_url: publicUrl,
      resume_thumbnail_status: 'complete',
      resume_thumbnail_error: null,
      resume_thumbnail_updated_at: new Date().toISOString(),
      resume_thumbnail_source_extension: 'custom',
    },
  } as Partial<DashboardProfile>);
};

export const deleteResumeAsset = async ({
  profile,
  updateProfile,
}: {
  profile: DashboardProfile | null;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to delete your resume.');

  const resumeUrl =
    typeof profile?.resume_url === 'string' ? profile.resume_url : '';
  if (!resumeUrl) throw new Error('No resume found to delete.');

  const uid = session.user.id;
  const storagePath = getResumeStoragePathFromPublicUrl(resumeUrl);
  const pathsToRemove = new Set<string>();
  if (storagePath) pathsToRemove.add(storagePath);
  for (const p of [
    `${uid}/resume.pdf`,
    `${uid}/resume-original.doc`,
    `${uid}/resume-original.docx`,
    `${uid}/resume.doc`,
    `${uid}/resume.docx`,
    `${uid}/resume-thumbnail.jpg`,
    `${uid}/resume-thumbnail.png`,
    resumeCustomThumbPath(uid),
  ]) {
    pathsToRemove.add(p);
  }
  const { error } = await supabase.storage
    .from('resumes')
    .remove([...pathsToRemove]);
  if (error) throw error;

  const currentCreds = profile?.nerd_creds ?? {};
  await updateProfile({
    resume_url: null,
    nerd_creds: {
      ...currentCreds,
      resume_file_name: null,
      resume_original_url: null,
      resume_thumbnail_url: undefined,
      resume_thumbnail_status: undefined,
      resume_thumbnail_error: null,
      resume_thumbnail_updated_at: undefined,
      resume_thumbnail_source_extension: undefined,
    },
  } as Partial<DashboardProfile>);
};

export const retryResumeThumbnailAsset = async ({
  profile,
  fetchData,
  updateProfile,
}: {
  profile: DashboardProfile | null;
  fetchData: () => Promise<void>;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You need to sign in to retry resume preview generation.');
  }

  const creds = profile?.nerd_creds as
    | {
        resume_file_name?: unknown;
        resume_original_url?: unknown;
      }
    | undefined;

  const resumeUrl =
    typeof profile?.resume_url === 'string' ? profile.resume_url.trim() : '';
  const originalUrl =
    typeof creds?.resume_original_url === 'string'
      ? creds.resume_original_url.trim()
      : '';

  if (!resumeUrl && !originalUrl) {
    throw new Error('No resume found to generate a preview.');
  }

  const fileName =
    typeof creds?.resume_file_name === 'string'
      ? String(creds.resume_file_name)
      : '';

  const urlForEligibility = resumeUrl || originalUrl;
  if (!resumeSupportsServerThumbnailGeneration(fileName, urlForEligibility)) {
    throw new Error(
      'Preview generation is only available for PDF and Word resumes (.pdf, .doc, .docx).',
    );
  }

  const urlExt =
    urlForEligibility.split('.').pop()?.toLowerCase().split('?')[0] || 'pdf';
  const uid = session.user.id;
  const primaryPath = resumeUrl
    ? getResumeStoragePathFromPublicUrl(resumeUrl)
    : null;
  const originalPath = originalUrl
    ? getResumeStoragePathFromPublicUrl(originalUrl)
    : null;
  const storagePath =
    (primaryPath && primaryPath.startsWith(`${uid}/`) ? primaryPath : null) ??
    (originalPath && originalPath.startsWith(`${uid}/`)
      ? originalPath
      : null) ??
    `${uid}/resume.${urlExt}`;

  const currentCreds =
    (profile?.nerd_creds as Record<string, unknown> | undefined) ?? {};
  await updateProfile({
    nerd_creds: {
      ...currentCreds,
      resume_thumbnail_status: 'pending',
      resume_thumbnail_error: null,
    },
  } as Partial<DashboardProfile>);
  await fetchData();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  let payload: unknown;
  try {
    response = await authedFetch(
      `${API_BASE}/api/resumes/generate-thumbnail`,
      {
        method: 'POST',
        body: JSON.stringify({ storagePath }),
        signal: controller.signal,
      },
      {
        includeJsonContentType: true,
        credentials: API_BASE ? 'omit' : 'include',
      },
    );
    payload = await readApiJsonBody(response);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    await fetchData();
    throw new Error(messageFromApiPayload(response.status, payload));
  }
  await fetchData();
};

export const normalizeThrownError = (cause: unknown) => {
  if (cause instanceof Error && cause.name === 'AbortError') {
    return 'Preview generation timed out. You can try again from the resume card.';
  }
  return toMessage(cause);
};
