import { authedFetch } from '../../lib/api/authFetch';
import { supabase } from '../../lib/auth/supabaseClient';
import { processAvatarForUpload } from '../../lib/utils/avatarResize';
import { messageFromApiResponse, toMessage } from '../../lib/utils/errors';
import type { DashboardProfile } from '../../types/profile';
import { getResumeStoragePathFromPublicUrl } from '../../lib/portfolio/resumeStorage';
import {
  API_BASE,
  RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
} from './useProfileHelpers';

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

  await updateProfile({ avatar: publicUrl });
  return publicUrl;
};

export const uploadResumeAsset = async ({
  file,
  updateProfile,
  fetchData,
}: {
  file: File;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<void>;
  fetchData: () => Promise<void>;
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

  const { error } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { upsert: true, contentType });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('resumes').getPublicUrl(fileName);

  await updateProfile({
    resume_url: publicUrl,
    nerd_creds: {
      resume_file_name: originalResumeFileName,
      resume_thumbnail_url: undefined,
      resume_thumbnail_error: null,
      resume_thumbnail_updated_at: undefined,
      resume_thumbnail_source_extension: undefined,
      ...(ext === '.doc' || ext === '.docx' || ext === '.pdf'
        ? { resume_thumbnail_status: 'pending' }
        : { resume_thumbnail_status: undefined }),
    },
  } as Partial<DashboardProfile>);

  if (ext === '.doc' || ext === '.docx' || ext === '.pdf') {
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
}: {
  profile: DashboardProfile | null;
  fetchData: () => Promise<void>;
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

  const ext = `.${resumeUrl.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!['.pdf', '.doc', '.docx'].includes(ext)) {
    throw new Error(
      'Retry preview is only available for PDF and Word documents.',
    );
  }

  const parsedStoragePath = getResumeStoragePathFromPublicUrl(resumeUrl);
  const storagePath =
    parsedStoragePath && parsedStoragePath.startsWith(`${session.user.id}/`)
      ? parsedStoragePath
      : `${session.user.id}/resume.${ext.slice(1)}`;

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

  await fetchData();

  if (!response.ok) {
    throw new Error(
      messageFromApiResponse(response.status, payload?.error, payload?.message),
    );
  }
};

export const normalizeThrownError = (cause: unknown) => {
  if (cause instanceof Error && cause.name === 'AbortError') {
    return 'Preview generation timed out. You can try again from the resume card.';
  }
  return toMessage(cause);
};
