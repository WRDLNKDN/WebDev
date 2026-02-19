import { describe, expect, it } from 'vitest';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../lib/chat/attachmentValidation';

describe('chat attachment validation', () => {
  it('accepts gif by mime', () => {
    expect(
      normalizeChatAttachmentMime({
        name: 'party.gif',
        type: 'image/gif',
      }),
    ).toBe('image/gif');
  });

  it('accepts docx by extension when mime is empty', () => {
    expect(
      normalizeChatAttachmentMime({
        name: 'resume.docx',
        type: '',
      }),
    ).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('rejects unsupported file type', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'archive.zip',
        type: 'application/zip',
        size: 1024,
      }),
    ).toContain('Unsupported type');
  });

  it('rejects file larger than 6mb', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'big.pdf',
        type: 'application/pdf',
        size: 7 * 1024 * 1024,
      }),
    ).toContain('File too large');
  });

  it('accepts allowed file under size limit', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'spec.pdf',
        type: 'application/pdf',
        size: 1024 * 1024,
      }),
    ).toBeNull();
  });
});
