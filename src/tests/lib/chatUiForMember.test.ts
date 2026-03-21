import { describe, expect, it } from 'vitest';
import { chatUiForMember } from '../../lib/utils/chatUiForMember';

describe('chatUiForMember', () => {
  it('is false without member id', () => {
    expect(chatUiForMember(true, null)).toBe(false);
    expect(chatUiForMember(true, undefined)).toBe(false);
    expect(chatUiForMember(true, '')).toBe(false);
  });

  it('is false when chat feature off', () => {
    expect(chatUiForMember(false, 'user-1')).toBe(false);
  });

  it('is true when chat on and member id present', () => {
    expect(chatUiForMember(true, 'user-1')).toBe(true);
  });
});
