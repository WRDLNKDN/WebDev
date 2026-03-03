import type { ChatAttachmentMeta } from '../../types/chat';

/**
 * Resolves mime and size per path for sendMessage. When the caller provides
 * attachmentMeta from the upload step (same length as paths), we use it so we
 * never need to call storage.list. Otherwise we fall back to octet-stream / 0.
 */
export function resolveAttachmentMetaForSend(
  paths: string[],
  meta?: ChatAttachmentMeta[] | null,
): Array<{ mime: string; size: number }> {
  const useMeta = meta && meta.length === paths.length ? meta : null;
  return paths.map((_p, i) =>
    useMeta?.[i]
      ? { mime: useMeta[i].mime, size: useMeta[i].size }
      : { mime: 'application/octet-stream', size: 0 },
  );
}
