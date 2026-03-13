import { CHAT_ALLOWED_EXTENSIONS, CHAT_ALLOWED_MIME } from '../../types/chat';
import { getChatAttachmentProcessingPlan } from './attachmentProcessing';

const EXTENSION_TO_MIME: Record<string, (typeof CHAT_ALLOWED_MIME)[number]> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

export function normalizeChatAttachmentMime(file: {
  type?: string | null;
  name: string;
}): string | null {
  const rawType = file.type?.toLowerCase().trim();
  if (
    rawType &&
    CHAT_ALLOWED_MIME.includes(rawType as (typeof CHAT_ALLOWED_MIME)[number])
  ) {
    return rawType;
  }
  const lowerName = file.name.toLowerCase();
  const ext = CHAT_ALLOWED_EXTENSIONS.find((allowedExt) =>
    lowerName.endsWith(allowedExt),
  );
  return ext ? EXTENSION_TO_MIME[ext] : null;
}

export function getChatAttachmentRejectionReason(file: {
  size: number;
  type?: string | null;
  name: string;
}): string | null {
  const normalized = normalizeChatAttachmentMime(file);
  if (!normalized) {
    return 'Unsupported type. Allowed: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.';
  }
  const plan = getChatAttachmentProcessingPlan({
    size: file.size,
    type: normalized,
  });
  if (!plan.accepted) {
    return plan.reason;
  }
  return null;
}
