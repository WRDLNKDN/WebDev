import {
  CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
} from '../../types/chat';

export { CHAT_GIF_PROCESSING_MAX_FILE_BYTES } from '../../types/chat';
export { CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES } from '../../types/chat';

export type ChatAttachmentProcessingPlan =
  | {
      accepted: true;
      mode: 'direct';
      uploadLabel: string;
      helperText: string | null;
    }
  | {
      accepted: true;
      mode: 'optimize';
      uploadLabel: string;
      helperText: string;
    }
  | {
      accepted: true;
      mode: 'gif_processing';
      uploadLabel: string;
      helperText: string;
    }
  | {
      accepted: false;
      reason: string;
    };

export function getChatAttachmentProcessingPlan(file: {
  size: number;
  type?: string | null;
}): ChatAttachmentProcessingPlan {
  const normalizedType = file.type?.toLowerCase().trim() ?? '';
  const isGif = normalizedType === 'image/gif';
  const isProcessedGifVideo =
    normalizedType === 'video/mp4' || normalizedType === 'video/webm';
  const isImage = normalizedType.startsWith('image/');

  if (isProcessedGifVideo) {
    if (file.size > CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES) {
      return {
        accepted: false,
        reason: 'This GIF is too large to process. Try a smaller file.',
      };
    }

    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: 'Attaching optimized GIF...',
      helperText: null,
    };
  }

  if (!isGif) {
    if (file.size > CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES) {
      return {
        accepted: false,
        reason: 'This file is too large to process. Try a file under 6 MB.',
      };
    }

    if (file.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES || isImage) {
      return {
        accepted: true,
        mode: 'optimize',
        uploadLabel: 'Optimizing attachment...',
        helperText: isImage
          ? 'Optimizing image and generating preview...'
          : 'Preparing attachment preview...',
      };
    }

    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: 'Uploading attachment...',
      helperText: null,
    };
  }

  if (file.size <= CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES) {
    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: 'Uploading GIF...',
      helperText: null,
    };
  }

  if (file.size <= CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES) {
    return {
      accepted: true,
      mode: 'gif_processing',
      uploadLabel: 'Converting GIF...',
      helperText: 'Converting GIF into lightweight looping playback...',
    };
  }

  return {
    accepted: false,
    reason: 'This GIF is too large to process. Try a smaller file.',
  };
}
