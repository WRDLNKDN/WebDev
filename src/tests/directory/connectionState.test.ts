import { describe, expect, it } from 'vitest';
import { connectionStateLabel } from '../../lib/directory/connectionState';

describe('directory connection state labels', () => {
  it('uses clear pending labels', () => {
    expect(connectionStateLabel.pending).toBe('Awaiting approval');
    expect(connectionStateLabel.pending_received).toBe('Needs your approval');
  });
});
