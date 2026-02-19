/**
 * Filters events to exclude those whose host is blocked by (or blocks) the viewer.
 * Used by EventsPage and unit tests.
 */
export function filterEventsByBlockedHosts<T extends { host_id: string }>(
  events: T[],
  blockedHostIds: Set<string>,
): T[] {
  return events.filter((ev) => !blockedHostIds.has(ev.host_id));
}
