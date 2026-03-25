import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CHAT_REDIRECT_TSX = readFileSync(
  'src/pages/chat/ChatRedirect.tsx',
  'utf8',
);

describe('chat redirect stability governance', () => {
  it('uses run-generation guard so stale async redirect work does not apply after a newer run', () => {
    expect(CHAT_REDIRECT_TSX).toContain('redirectRunGenRef');
    expect(CHAT_REDIRECT_TSX).toContain('redirectTargetKey');
    expect(CHAT_REDIRECT_TSX).toContain('stillValid');
    expect(CHAT_REDIRECT_TSX).toContain('myGen === redirectRunGenRef.current');
  });

  it('opens overlay deterministically instead of toggling in redirect flow', () => {
    expect(CHAT_REDIRECT_TSX).toContain('messenger.openOverlay()');
    expect(CHAT_REDIRECT_TSX).not.toContain('messenger.toggleOverlay()');
  });
});
