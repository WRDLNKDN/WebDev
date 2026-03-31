import { describe, expect, it } from 'vitest';
import {
  resumeFieldsFromCreds,
  selectedInterestsFromCredsInput,
  selectedSkillsFromCredsInput,
} from '../../lib/profile/nerdCredsDisplay';

describe('nerdCredsDisplay', () => {
  it('parses resume fields', () => {
    expect(
      resumeFieldsFromCreds({
        resume_thumbnail_url: 'https://x',
        resume_file_name: 'cv.pdf',
        resume_thumbnail_status: 'complete',
      }),
    ).toEqual({
      resumeThumbnailUrl: 'https://x',
      resumeFileName: 'cv.pdf',
      resumeThumbnailStatus: 'complete',
    });
  });

  it('parses skills array and comma string', () => {
    expect(selectedSkillsFromCredsInput({ skills: [' a ', 'b'] })).toEqual([
      'a',
      'b',
    ]);
    expect(selectedSkillsFromCredsInput({ skills: 'x, y' })).toEqual([
      'x',
      'y',
    ]);
  });

  it('parses interests array and comma string', () => {
    expect(
      selectedInterestsFromCredsInput({ interests: ['Rust', 'Go'] }),
    ).toEqual(['Rust', 'Go']);
    expect(selectedInterestsFromCredsInput({ interests: 'a,b' })).toEqual([
      'a',
      'b',
    ]);
  });
});
