/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageList } from '../../components/chat/message/MessageList';
import type { MessageWithExtras } from '../../hooks/chatTypes';

const linkPreviewMocks = vi.hoisted(() => ({
  fetchChatLinkPreview: vi.fn(),
  getFirstUrlFromText: vi.fn((text: string) => {
    const match = text.match(/https?:\/\/\S+/);
    return match ? match[0] : null;
  }),
}));

vi.mock('../../lib/chat/linkPreview', () => ({
  fetchChatLinkPreview: linkPreviewMocks.fetchChatLinkPreview,
  getFirstUrlFromText: linkPreviewMocks.getFirstUrlFromText,
}));

vi.mock('../../context/AppToastContext', () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../components/post', () => ({
  PostCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../../components/chat/message/AttachmentPreview', () => ({
  AttachmentPreview: () => null,
}));

vi.mock('../../pages/feed/feedRenderUtils', () => ({
  LinkPreviewCard: ({
    preview,
  }: {
    preview: { title?: string | null; url: string };
  }) => (
    <div data-testid="chat-link-preview">{preview.title ?? preview.url}</div>
  ),
}));

function createMessage(content: string): MessageWithExtras {
  return {
    id: 'message-1',
    room_id: 'room-1',
    sender_id: 'user-2',
    content,
    created_at: '2026-03-27T12:00:00.000Z',
    edited_at: null,
    is_deleted: false,
    is_system_message: false,
    sender_profile: {
      handle: 'tester',
      display_name: 'Tester',
      avatar: null,
    },
    reactions: [],
    attachments: [],
    read_by: [],
    reply_preview: null,
  };
}

async function waitForAssertion(
  assertion: () => void,
  timeoutMs = 1500,
  intervalMs = 25,
) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw lastError ?? new Error('Timed out waiting for assertion');
}

describe('MessageList link previews', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    linkPreviewMocks.fetchChatLinkPreview.mockReset();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('refreshes the preview when a message URL changes and clears it when removed', async () => {
    linkPreviewMocks.fetchChatLinkPreview
      .mockResolvedValueOnce({
        url: 'https://example.com/one',
        title: 'First Link',
      })
      .mockResolvedValueOnce({
        url: 'https://example.com/two',
        title: 'Second Link',
      });

    await act(async () => {
      root.render(
        <MessageList
          messages={[createMessage('Look https://example.com/one')]}
          currentUserId="user-1"
          roomType="dm"
        />,
      );
    });

    await waitForAssertion(() => {
      expect(document.body.textContent).toContain('First Link');
    });

    await act(async () => {
      root.render(
        <MessageList
          messages={[createMessage('Now https://example.com/two')]}
          currentUserId="user-1"
          roomType="dm"
        />,
      );
    });

    await waitForAssertion(() => {
      expect(document.body.textContent).toContain('Second Link');
      expect(document.body.textContent).not.toContain('First Link');
    });

    await act(async () => {
      root.render(
        <MessageList
          messages={[createMessage('No url anymore')]}
          currentUserId="user-1"
          roomType="dm"
        />,
      );
    });

    await waitForAssertion(() => {
      expect(document.body.textContent).not.toContain('Second Link');
    });
    expect(linkPreviewMocks.fetchChatLinkPreview).toHaveBeenCalledTimes(2);
  });
});
