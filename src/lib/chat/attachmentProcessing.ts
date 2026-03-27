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
    if (file.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES) {
      return {
        accepted: false,
        reason: 'File must be 2MB or smaller.',
      };
    }

    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: 'Uploading attachment...',
      helperText: null,
    };
  }

  if (file.size <= CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES) {
    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: 'Uploading GIF...',
      helperText: null,
    };
  }

  return {
    accepted: false,
    reason: 'This GIF is too large to process. Try a smaller file.',
  };
}
