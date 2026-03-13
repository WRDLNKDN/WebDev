import { describe, expect, it } from 'vitest';
import {
  buildFeedReactionSummary,
  getFeedTotalReactionCount,
} from '../../components/post/sharedReactions';

describe('buildFeedReactionSummary', () => {
  it('prioritizes the viewer-selected Laugh reaction in the visible summary', () => {
    const summary = buildFeedReactionSummary(
      {
        like_count: 3,
        love_count: 2,
        inspiration_count: 1,
        care_count: 0,
        laughing_count: 1,
        rage_count: 0,
      },
      'laughing',
    );

    expect(summary.map((reaction) => reaction.value)).toEqual([
      'laughing',
      'like',
      'love',
    ]);
  });

  it('prioritizes the viewer-selected Rage reaction in the visible summary', () => {
    const summary = buildFeedReactionSummary(
      {
        like_count: 3,
        love_count: 2,
        inspiration_count: 1,
        care_count: 0,
        laughing_count: 0,
        rage_count: 1,
      },
      'rage',
    );

    expect(summary.map((reaction) => reaction.value)).toEqual([
      'rage',
      'like',
      'love',
    ]);
  });

  it('keeps a freshly selected Laugh visible even if the backing count has not caught up yet', () => {
    const summary = buildFeedReactionSummary(
      {
        like_count: 0,
        love_count: 0,
        inspiration_count: 0,
        care_count: 0,
        laughing_count: 0,
        rage_count: 0,
      },
      'laughing',
    );

    expect(summary.map((reaction) => reaction.value)).toEqual(['laughing']);
    expect(summary[0]?.count).toBe(1);
    expect(
      getFeedTotalReactionCount(
        {
          like_count: 0,
          love_count: 0,
          inspiration_count: 0,
          care_count: 0,
          laughing_count: 0,
          rage_count: 0,
        },
        'laughing',
      ),
    ).toBe(1);
  });
});
