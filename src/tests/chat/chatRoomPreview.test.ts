import { describe, expect, it } from 'vitest';
import { sanitizeChatRoomPreview } from '../../lib/chat/roomPreview';

describe('sanitizeChatRoomPreview', () => {
  it('removes reaction-only lines from room previews', () => {
    expect(sanitizeChatRoomPreview('See you tomorrow\n😂 2 😡 1', false)).toBe(
      'See you tomorrow',
    );
  });

  it('falls back when the preview contains only reaction metadata', () => {
    expect(sanitizeChatRoomPreview('😂 2 😡 1', false)).toBe('—');
  });

  it('keeps normal emoji-bearing message content intact', () => {
    expect(sanitizeChatRoomPreview('That was wild 😂', false)).toBe(
      'That was wild 😂',
    );
  });
});
