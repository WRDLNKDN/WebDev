import { describe, expect, it } from 'vitest';
import {
  getConnectIntent,
  getConnectionOutcomeNotificationType,
} from '../../../backend/directory/connectionFlow';

describe('directory connection flow helper', () => {
  it('creates pending request when no reverse pending request exists', () => {
    expect(getConnectIntent(false)).toBe('create_pending');
  });

  it('auto-accepts when reverse pending request exists', () => {
    expect(getConnectIntent(true)).toBe('auto_accept_reverse_pending');
  });

  it('maps accepted outcome to accepted notification type', () => {
    expect(getConnectionOutcomeNotificationType('accepted')).toBe(
      'connection_request_accepted',
    );
  });

  it('maps declined outcome to declined notification type', () => {
    expect(getConnectionOutcomeNotificationType('declined')).toBe(
      'connection_request_declined',
    );
  });
});
