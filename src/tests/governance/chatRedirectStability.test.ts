import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CHAT_REDIRECT_TSX = readFileSync(
  'src/pages/chat/ChatRedirect.tsx',
  'utf8',
);

describe('chat redirect stability governance', () => {
  it('uses one-shot target guard to avoid repeated redirect loops', () => {
    expect(CHAT_REDIRECT_TSX).toContain('handledTargetRef');
    expect(CHAT_REDIRECT_TSX).toContain('redirectTargetKey');
    expect(CHAT_REDIRECT_TSX).toContain(
      'handledTargetRef.current === redirectTargetKey',
    );
  });

  it('opens overlay deterministically instead of toggling in redirect flow', () => {
    expect(CHAT_REDIRECT_TSX).toContain('messenger.openOverlay()');
    expect(CHAT_REDIRECT_TSX).not.toContain('messenger.toggleOverlay()');
  });
});
