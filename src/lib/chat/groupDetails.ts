import { uploadStructuredPublicAsset } from '../media/ingestion';

export const CHAT_GROUP_DESCRIPTION_MAX = 256;
export const CHAT_GROUP_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

export type ChatGroupDetailsInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
};

export function normalizeChatGroupDescription(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, CHAT_GROUP_DESCRIPTION_MAX);
}

type ErrorWithMessage = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

function messageFromCause(cause: unknown): string {
  if (typeof cause === 'string') return cause;
  if (cause instanceof Error) return cause.message;
  if (
    cause &&
    typeof cause === 'object' &&
    typeof (cause as ErrorWithMessage).message === 'string'
  ) {
    return (cause as ErrorWithMessage).message ?? '';
  }
  return '';
}

export function isChatGroupOptionalDetailsUnsupportedError(
  cause: unknown,
): boolean {
  const message = messageFromCause(cause);
  const code =
    cause &&
    typeof cause === 'object' &&
    typeof (cause as ErrorWithMessage).code === 'string'
      ? (cause as ErrorWithMessage).code
      : '';

  const mentionsOptionalField = /(description|image_url)/i.test(message);
  const mentionsChatRooms = /chat_rooms/i.test(message);

  return (
    ((/schema cache/i.test(message) || code === 'PGRST204') &&
      mentionsOptionalField &&
      mentionsChatRooms) ||
    (code === '42703' && mentionsOptionalField) ||
    (/column .* does not exist/i.test(message) && mentionsOptionalField)
  );
}

export function assertValidChatGroupImage(file: File): void {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Group picture must be a PNG, JPG, or WebP image.');
  }
}

export async function uploadChatGroupImageAsset(params: {
  file: File;
  currentUserId: string;
}): Promise<string> {
  assertValidChatGroupImage(params.file);
  const asset = await uploadStructuredPublicAsset({
    bucket: 'avatars',
    ownerId: params.currentUserId,
    scope: 'groups',
    file: params.file,
    retainOriginal: true,
  });
  return asset.displayUrl;
}
