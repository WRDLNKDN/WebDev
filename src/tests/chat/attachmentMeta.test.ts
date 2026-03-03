import { describe, expect, it } from 'vitest';
import { resolveAttachmentMetaForSend } from '../../lib/chat/attachmentMeta';

describe('resolveAttachmentMetaForSend', () => {
  it('uses provided meta when length matches paths', () => {
    const paths = ['user-id/1_0.pdf', 'user-id/1_1.jpg'];
    const meta = [
      { path: paths[0], mime: 'application/pdf', size: 100 },
      { path: paths[1], mime: 'image/jpeg', size: 200 },
    ];
    const result = resolveAttachmentMetaForSend(paths, meta);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ mime: 'application/pdf', size: 100 });
    expect(result[1]).toEqual({ mime: 'image/jpeg', size: 200 });
  });

  it('falls back to octet-stream and 0 when meta is missing', () => {
    const paths = ['user-id/1_0.pdf'];
    const result = resolveAttachmentMetaForSend(paths);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      mime: 'application/octet-stream',
      size: 0,
    });
  });

  it('falls back when meta length does not match paths', () => {
    const paths = ['user-id/1_0.pdf', 'user-id/1_1.jpg'];
    const meta = [{ path: paths[0], mime: 'application/pdf', size: 100 }];
    const result = resolveAttachmentMetaForSend(paths, meta);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      mime: 'application/octet-stream',
      size: 0,
    });
    expect(result[1]).toEqual({
      mime: 'application/octet-stream',
      size: 0,
    });
  });

  it('falls back when meta is empty array', () => {
    const paths = ['user-id/1_0.pdf'];
    const result = resolveAttachmentMetaForSend(paths, []);
    expect(result[0]).toEqual({
      mime: 'application/octet-stream',
      size: 0,
    });
  });
});
