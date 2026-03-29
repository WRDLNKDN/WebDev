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
