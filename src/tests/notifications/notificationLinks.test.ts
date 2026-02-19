import { describe, expect, it } from 'vitest';
import {
  getNotificationLink,
  type NotificationRowForLink,
} from '../../lib/notifications/notificationLinks';

function row(
  overrides: Partial<NotificationRowForLink>,
): NotificationRowForLink {
  return {
    type: 'reaction',
    reference_id: null,
    reference_type: null,
    payload: {},
    ...overrides,
  };
}

describe('getNotificationLink', () => {
  it('returns /directory for connection_request', () => {
    expect(getNotificationLink(row({ type: 'connection_request' }))).toBe(
      '/directory',
    );
  });

  it('returns /feed?post=id for feed_item with reference_id', () => {
    expect(
      getNotificationLink(
        row({
          type: 'reaction',
          reference_type: 'feed_item',
          reference_id: 'abc-123',
        }),
      ),
    ).toBe('/feed?post=abc-123');
  });

  it('returns /feed for feed_item when reference_exists is false', () => {
    expect(
      getNotificationLink(
        row({
          type: 'reaction',
          reference_type: 'feed_item',
          reference_id: 'abc-123',
          reference_exists: false,
        }),
      ),
    ).toBe('/feed');
  });

  it('returns /chat/roomId for chat_message with room_id', () => {
    expect(
      getNotificationLink(
        row({
          type: 'chat_message',
          payload: { room_id: 'room-xyz' },
        }),
      ),
    ).toBe('/chat/room-xyz');
  });

  it('returns /chat when chat_message has no room_id', () => {
    expect(
      getNotificationLink(row({ type: 'chat_message', payload: {} })),
    ).toBe('/chat');
  });

  it('returns /chat when chat_message reference is deleted', () => {
    expect(
      getNotificationLink(
        row({
          type: 'chat_message',
          payload: { room_id: 'room-xyz' },
          reference_exists: false,
        }),
      ),
    ).toBe('/chat');
  });

  it('returns /events/:id for event_rsvp with reference_id', () => {
    expect(
      getNotificationLink(
        row({
          type: 'event_rsvp',
          reference_id: 'ev-456',
        }),
      ),
    ).toBe('/events/ev-456');
  });

  it('returns /events when event_rsvp reference is deleted', () => {
    expect(
      getNotificationLink(
        row({
          type: 'event_rsvp',
          reference_id: 'ev-456',
          reference_exists: false,
        }),
      ),
    ).toBe('/events');
  });

  it('returns /feed for unknown type', () => {
    expect(getNotificationLink(row({ type: 'unknown' }))).toBe('/feed');
  });
});
