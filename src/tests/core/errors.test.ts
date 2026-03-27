import { describe, expect, it } from 'vitest';
import { toMessage } from '../../lib/utils/errors';

describe('toMessage', () => {
  it('handles Error', () => {
    expect(toMessage(new Error('boom'))).toBe('boom');
  });

  it('handles string', () => {
    expect(toMessage('nope')).toBe('nope');
  });

  it('handles unknown', () => {
    expect(toMessage({})).toBe(
      'An unexpected error occurred. Try refreshing the page, or contact support if it persists.',
    );
  });

  it('maps reply schema cache errors to friendly copy', () => {
    expect(
      toMessage(
        "Could not find the 'reply_to_message_id' column of 'chat_messages' in the schema cache.",
      ),
    ).toBe(
      "Replying isn't fully available right now. Please refresh and try again.",
    );
  });
});
