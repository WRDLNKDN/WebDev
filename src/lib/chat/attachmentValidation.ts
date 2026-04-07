import { CHAT_ALLOWED_EXTENSIONS, CHAT_ALLOWED_MIME } from '../../types/chat';
import { getChatAttachmentProcessingPlan } from './attachmentProcessing';
import {
  getSharedUploadRejectionReason,
  normalizeUploadMimeFromMetadata,
} from '../media/uploadIntake';

export function normalizeChatAttachmentMime(file: {
  type?: string | null;
  name?: string;
}): string | null {
  const normalized = normalizeUploadMimeFromMetadata(file);
  if (
    normalized &&
    CHAT_ALLOWED_MIME.includes(normalized as (typeof CHAT_ALLOWED_MIME)[number])
  ) {
    return normalized;
  }
  const lowerName = (file.name ?? '').toLowerCase();
  return CHAT_ALLOWED_EXTENSIONS.find((allowedExt) =>
    lowerName.endsWith(allowedExt),
  )
    ? normalized
    : null;
}

export function getChatAttachmentRejectionReason(file: {
  size: number;
  type?: string | null;
  name?: string;
}): string | null {
  const normalized = normalizeChatAttachmentMime(file);
  if (!normalized)
    return 'Unsupported type. Allowed: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.';

  const sharedRejection = getSharedUploadRejectionReason('chat_attachment', {
    ...file,
    type: normalized,
  });
  if (sharedRejection) return sharedRejection;

  const plan = getChatAttachmentProcessingPlan({
    size: file.size,
    type: normalized,
  });
  return plan.accepted ? null : plan.reason;
}
