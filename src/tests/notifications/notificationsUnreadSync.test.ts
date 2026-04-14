import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onNotificationsUnreadRefreshRequest,
  requestNotificationsUnreadRefresh,
} from '../../lib/notifications/notificationsUnreadSync';

describe('notificationsUnreadSync', () => {
  beforeEach(() => {
    const listeners = new Map<string, Set<(ev: { type: string }) => void>>();
    vi.stubGlobal(
      'CustomEvent',
      class MockCustomEvent {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
    );
    vi.stubGlobal('window', {
      addEventListener(type: string, fn: (ev: { type: string }) => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: (ev: { type: string }) => void) {
        listeners.get(type)?.delete(fn);
      },
      dispatchEvent(ev: { type: string }) {
        const set = listeners.get(ev.type);
        if (set) {
          for (const fn of set) fn(ev);
        }
        return true;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('invokes subscribers when refresh is requested', () => {
    const handler = vi.fn();
    const off = onNotificationsUnreadRefreshRequest(handler);
    requestNotificationsUnreadRefresh();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    requestNotificationsUnreadRefresh();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
