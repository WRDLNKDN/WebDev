import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHAT_REDIRECT_RETURN,
  resolveChatRedirectReturnPath,
} from '../../lib/routing/chatRedirectReturnPath';

describe('resolveChatRedirectReturnPath', () => {
  it('defaults to feed when missing', () => {
    expect(resolveChatRedirectReturnPath(null)).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
    expect(resolveChatRedirectReturnPath('')).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
  });

  it('accepts safe pathnames', () => {
    expect(resolveChatRedirectReturnPath('/directory')).toBe('/directory');
    expect(resolveChatRedirectReturnPath('/feed')).toBe('/feed');
    expect(resolveChatRedirectReturnPath('/dashboard/games')).toBe(
      '/dashboard/games',
    );
  });

  it('strips query and hash', () => {
    expect(resolveChatRedirectReturnPath('/directory?x=1')).toBe('/directory');
    expect(resolveChatRedirectReturnPath('/directory#frag')).toBe('/directory');
  });

  it('rejects open-redirect patterns', () => {
    expect(resolveChatRedirectReturnPath('//evil.com')).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
    expect(resolveChatRedirectReturnPath('https://evil.com')).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
    expect(resolveChatRedirectReturnPath('/a/../b')).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
    expect(resolveChatRedirectReturnPath('javascript:alert(1)')).toBe(
      DEFAULT_CHAT_REDIRECT_RETURN,
    );
  });
});
