import { supabase } from '../auth/supabaseClient';
import { processAvatarForUpload } from '../utils/avatarResize';

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
  const { blob } = await processAvatarForUpload(params.file);
  const ext =
    blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  const path = `groups/${params.currentUserId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  return publicUrl;
}
