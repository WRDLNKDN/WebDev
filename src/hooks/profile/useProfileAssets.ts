import { authedFetch } from '../../lib/api/authFetch';
import { supabase } from '../../lib/auth/supabaseClient';
import { processAvatarForUpload } from '../../lib/utils/avatarResize';
import { messageFromApiResponse, toMessage } from '../../lib/utils/errors';
import type { DashboardProfile } from '../../types/profile';
import { processResumeThumbnailImageForUpload } from '../../lib/portfolio/processResumeThumbnailImage';
import { getResumeStoragePathFromPublicUrl } from '../../lib/portfolio/resumeStorage';
import {
  API_BASE,
  RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
} from './useProfileHelpers';
import { resumeSupportsServerThumbnailGeneration } from '../../lib/portfolio/resumePreviewSupport';

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
}) => {
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

  /** Max resume size (align with SPIKE: no auto-compress for documents; enforce limit). */
  const RESUME_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > RESUME_MAX_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Resume is too large (${sizeMb} MB). Maximum size is 10 MB. Try compressing the file or using a smaller document.`,
    );
  }

  const normalizedExt = ext.slice(1);
  const fileName = `${session.user.id}/resume.${normalizedExt}`;
  const originalResumeFileName = file.name?.trim()
    ? file.name.trim()
    : `Resume.${normalizedExt}`;
  const contentType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const previousUrl =
    typeof profile?.resume_url === 'string' ? profile.resume_url : '';
  const previousPath = previousUrl
    ? getResumeStoragePathFromPublicUrl(previousUrl)
    : null;
  if (
    previousPath &&
    previousPath !== fileName &&
    previousPath.startsWith(`${session.user.id}/`)
  ) {
    const { error: removeError } = await supabase.storage
      .from('resumes')
      .remove([previousPath]);
    if (removeError) {
      console.warn('[uploadResume] could not remove previous resume object', {
        previousPath,
        message: removeError.message,
      });
    }
  }

  const { error } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { upsert: true, contentType });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('resumes').getPublicUrl(fileName);

  const thumbTargetPending = resumeSupportsServerThumbnailGeneration(
    originalResumeFileName,
    publicUrl,
  );

  await updateProfile({
    resume_url: publicUrl,
    nerd_creds: {
      resume_file_name: originalResumeFileName,
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
      const payload = (await response.json()) as
        | {
            ok?: boolean;
            data?: { status?: string; thumbnailUrl?: string };
            error?: string;
            message?: string;
          }
        | undefined;
      if (!response.ok) {
        throw new Error(
          messageFromApiResponse(
            response.status,
            payload?.error,
            payload?.message,
          ),
        );
      }
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
    }
  }

  return publicUrl;
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

  const storagePath = getResumeStoragePathFromPublicUrl(resumeUrl);
  if (storagePath) {
    const { error } = await supabase.storage
      .from('resumes')
      .remove([storagePath]);
    if (error) throw error;
  }

  const currentCreds = profile?.nerd_creds ?? {};
  await updateProfile({
    resume_url: null,
    nerd_creds: {
      ...currentCreds,
      resume_file_name: null,
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

  const resumeUrl =
    typeof profile?.resume_url === 'string' ? profile.resume_url : '';
  if (!resumeUrl) throw new Error('No resume found to generate a preview.');

  const fileName =
    typeof profile?.nerd_creds === 'object' &&
    profile.nerd_creds &&
    typeof (profile.nerd_creds as { resume_file_name?: unknown })
      .resume_file_name === 'string'
      ? String(
          (profile.nerd_creds as { resume_file_name: string }).resume_file_name,
        )
      : '';

  if (!resumeSupportsServerThumbnailGeneration(fileName, resumeUrl)) {
    throw new Error(
      'Preview generation is only available for PDF resumes. Open your Word resume to view it.',
    );
  }

  const urlExt =
    resumeUrl.split('.').pop()?.toLowerCase().split('?')[0] || 'pdf';
  const parsedStoragePath = getResumeStoragePathFromPublicUrl(resumeUrl);
  const storagePath =
    parsedStoragePath && parsedStoragePath.startsWith(`${session.user.id}/`)
      ? parsedStoragePath
      : `${session.user.id}/resume.${urlExt}`;

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
  let payload: { error?: string; message?: string } | undefined;
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
    payload = (await response.json()) as
      | { error?: string; message?: string }
      | undefined;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    await fetchData();
    throw new Error(
      messageFromApiResponse(response.status, payload?.error, payload?.message),
    );
  }
  await fetchData();
};

export const normalizeThrownError = (cause: unknown) => {
  if (cause instanceof Error && cause.name === 'AbortError') {
    return 'Preview generation timed out. You can try again from the resume card.';
  }
  return toMessage(cause);
};
