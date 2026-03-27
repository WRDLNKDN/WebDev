import { describe, expect, it } from 'vitest';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../lib/chat/attachmentValidation';
import { getChatAttachmentProcessingPlan } from '../../lib/chat/attachmentProcessing';

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

  it('rejects file larger than 2MB', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'big.pdf',
        type: 'application/pdf',
        size: 3 * 1024 * 1024,
      }),
    ).toBe('File must be 2MB or smaller.');
  });

  it('allows GIFs under the 6MB upload ceiling', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'party.gif',
        type: 'image/gif',
        size: 5 * 1024 * 1024,
      }),
    ).toBeNull();
  });

  it('rejects GIFs above the 6MB upload ceiling with a helpful message', () => {
    expect(
      getChatAttachmentRejectionReason({
        name: 'too-big.gif',
        type: 'image/gif',
        size: 7 * 1024 * 1024,
      }),
    ).toBe('This GIF is too large to process. Try a smaller file.');
  });

  it('accepts processed GIF video attachments within the media ceiling', () => {
    expect(
      getChatAttachmentProcessingPlan({
        type: 'video/mp4',
        size: 6 * 1024 * 1024,
      }),
    ).toMatchObject({
      accepted: true,
      mode: 'direct',
    });
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
