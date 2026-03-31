import { describe, expect, it } from 'vitest';
import { formatGameElapsedClock } from '../../components/games/GameEndScreen';

describe('formatGameElapsedClock', () => {
  it('pads seconds and formats minutes', () => {
    expect(formatGameElapsedClock(0)).toBe('0:00');
    expect(formatGameElapsedClock(65)).toBe('1:05');
    expect(formatGameElapsedClock(599)).toBe('9:59');
  });
});
