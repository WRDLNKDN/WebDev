/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentPreview } from '../../components/chat/message/AttachmentPreview';

const { createSignedUrlMock, fromMock } = vi.hoisted(() => {
  const createSignedUrlMock = vi.fn();
  const fromMock = vi.fn(() => ({
    createSignedUrl: createSignedUrlMock,
  }));
  return { createSignedUrlMock, fromMock };
});

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {
    storage: {
      from: fromMock,
    },
  },
}));

describe('AttachmentPreview', () => {
  beforeEach(() => {
    fromMock.mockClear();
    createSignedUrlMock.mockReset();
    createSignedUrlMock.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://example.test/${path}` },
      error: null,
    }));
  });

  it('only signs the display asset for inline images', async () => {
    render(
      <AttachmentPreview
        path="chat/u1/attachment/original.png"
        mimeType="image/png"
      />,
    );

    await waitFor(() => {
      expect(screen.getByAltText('Attachment preview')).toBeInTheDocument();
    });

    expect(fromMock).toHaveBeenCalledWith('chat-attachments');
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(createSignedUrlMock).toHaveBeenCalledWith(
      'chat/u1/attachment/display.png',
      3600,
    );
  });
});
