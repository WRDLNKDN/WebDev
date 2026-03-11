import { describe, expect, it } from 'vitest';
import { REACTION_OPTIONS } from '../../components/post/FeedReactionBar';
import { CHAT_REACTION_OPTIONS } from '../../components/post/sharedReactions';

describe('REACTION_OPTIONS', () => {
  it('uses the shared chat emoji set and labels for feed reactions', () => {
    const care = REACTION_OPTIONS.find((option) => option.type === 'care');
    const laughing = REACTION_OPTIONS.find(
      (option) => option.type === 'laughing',
    );
    const inspiration = REACTION_OPTIONS.find(
      (option) => option.type === 'inspiration',
    );
    const rage = REACTION_OPTIONS.find((option) => option.type === 'rage');

    expect(care?.label).toBe('Prayer Hands');
    expect(care?.emoji).toBe('🙏');
    expect(laughing?.label).toBe('Laugh');
    expect(laughing?.emoji).toBe('😂');
    expect(inspiration?.label).toBe('Surprised');
    expect(inspiration?.emoji).toBe('😮');
    expect(rage?.label).toBe('Sad');
    expect(rage?.emoji).toBe('😢');
  });

  it('keeps chat and feed reaction trays aligned', () => {
    expect(CHAT_REACTION_OPTIONS.map((option) => option.emoji)).toEqual(
      REACTION_OPTIONS.map((option) => option.emoji),
    );
    expect(CHAT_REACTION_OPTIONS.map((option) => option.label)).toEqual(
      REACTION_OPTIONS.map((option) => option.label),
    );
  });
});
