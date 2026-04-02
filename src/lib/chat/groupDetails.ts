import { uploadStructuredPublicAsset } from '../media/ingestion';
import {
  getSharedUploadRejectionReason,
  runSharedUploadIntake,
  type SharedUploadState,
} from '../media/uploadIntake';

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
  const rejectionReason = getSharedUploadRejectionReason('group_image', file);
  if (rejectionReason) throw new Error(rejectionReason);
}

export async function uploadChatGroupImageAsset(params: {
  file: File;
  currentUserId: string;
  onStateChange?: (state: SharedUploadState) => void;
}): Promise<string> {
  const asset = await runSharedUploadIntake({
    surface: 'group_image',
    file: params.file,
    onStateChange: params.onStateChange,
    executeUpload: async ({ file }) =>
      uploadStructuredPublicAsset({
        bucket: 'avatars',
        ownerId: params.currentUserId,
        scope: 'groups',
        file,
        retainOriginal: true,
      }),
  });
  return asset.displayUrl;
}
