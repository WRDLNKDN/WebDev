import { describe, expect, it } from 'vitest';
import {
  isValidAdvertiserDestinationUrl,
  validateAdvertiseFields,
} from '../../lib/marketing/advertiseValidation';

describe('advertiseValidation', () => {
  it('requires a secure destination url', () => {
    expect(isValidAdvertiserDestinationUrl('')).toBe(false);
    expect(isValidAdvertiserDestinationUrl('example.com')).toBe(false);
    expect(isValidAdvertiserDestinationUrl('http://example.com')).toBe(false);
    expect(isValidAdvertiserDestinationUrl('https://example.com')).toBe(true);
  });

  it('returns inline field errors for invalid submissions', () => {
    const errors = validateAdvertiseFields({
      name: 'A',
      email: 'bad-email',
      destinationUrl: 'http://example.com',
      message: 'short',
      adCopyDescription: 'short',
      iconFile: null,
    });

    expect(errors).toEqual({
      name: 'Name must be at least 2 characters.',
      email: 'Enter a valid email address.',
      destinationUrl: 'Enter a valid https:// destination URL.',
      message: 'Message must be at least 10 characters.',
      adCopyDescription: 'Ad Copy Description must be at least 10 characters.',
      icon: 'Icon/logo file is required.',
    });
  });
});
