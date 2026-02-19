import { describe, expect, it } from 'vitest';
import { filterEventsByBlockedHosts } from '../../lib/events/blockedFilter';

describe('filterEventsByBlockedHosts', () => {
  const events = [
    { host_id: 'host-a', title: 'A' },
    { host_id: 'host-b', title: 'B' },
    { host_id: 'host-c', title: 'C' },
  ];

  it('returns all events when blocked set is empty', () => {
    expect(filterEventsByBlockedHosts(events, new Set())).toEqual(events);
  });

  it('filters out events from blocked hosts', () => {
    const blocked = new Set(['host-b']);
    expect(filterEventsByBlockedHosts(events, blocked)).toEqual([
      { host_id: 'host-a', title: 'A' },
      { host_id: 'host-c', title: 'C' },
    ]);
  });

  it('filters out multiple blocked hosts', () => {
    const blocked = new Set(['host-a', 'host-c']);
    expect(filterEventsByBlockedHosts(events, blocked)).toEqual([
      { host_id: 'host-b', title: 'B' },
    ]);
  });

  it('returns empty array when all hosts blocked', () => {
    const blocked = new Set(['host-a', 'host-b', 'host-c']);
    expect(filterEventsByBlockedHosts(events, blocked)).toEqual([]);
  });

  it('preserves extra properties on events', () => {
    const extended = [{ host_id: 'x', id: '1', start_at: '2025-01-01' }];
    const blocked = new Set<string>();
    expect(filterEventsByBlockedHosts(extended, blocked)).toEqual(extended);
  });
});
