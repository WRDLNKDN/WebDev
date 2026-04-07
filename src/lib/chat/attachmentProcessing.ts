import type { MediaSizeRejectionCode } from '../media/mediaSizePolicy';
import { getSharedUploadPlanFromDescriptor } from '../media/uploadIntake';

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
      rejectionCode: MediaSizeRejectionCode;
    };

export function getChatAttachmentProcessingPlan(file: {
  size: number;
  type?: string | null;
}): ChatAttachmentProcessingPlan {
  const plan = getSharedUploadPlanFromDescriptor('chat_attachment', {
    name: 'attachment',
    size: file.size,
    type: file.type ?? null,
  });
  if (!plan.accepted) {
    return {
      accepted: false,
      reason: plan.reason,
      rejectionCode: plan.rejectionCode,
    };
  }

  if (plan.mode === 'direct') {
    return {
      accepted: true,
      mode: 'direct',
      uploadLabel: plan.uploadLabel,
      helperText: plan.helperText,
    };
  }

  if (plan.mode === 'optimize') {
    return {
      accepted: true,
      mode: 'optimize',
      uploadLabel: plan.uploadLabel,
      helperText: plan.helperText ?? 'Preparing attachment preview...',
    };
  }

  return {
    accepted: true,
    mode: 'gif_processing',
    uploadLabel: plan.uploadLabel,
    helperText:
      plan.helperText ?? 'Converting GIF into lightweight looping playback...',
  };
}
