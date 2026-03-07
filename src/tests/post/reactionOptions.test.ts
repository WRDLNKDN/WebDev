import { describe, expect, it } from 'vitest';
import { REACTION_OPTIONS } from '../../components/post/FeedReactionBar';

describe('REACTION_OPTIONS', () => {
  it('keeps care and happy mapped to the approved colors', () => {
    const care = REACTION_OPTIONS.find((option) => option.type === 'care');
    const happy = REACTION_OPTIONS.find((option) => option.type === 'laughing');

    expect(care?.label).toBe('Care');
    expect(care?.color).toBe('#9c27b0');
    expect(happy?.label).toBe('Happy');
    expect(happy?.color).toBe('#66bb6a');
  });
});
