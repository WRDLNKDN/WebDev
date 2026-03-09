import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {},
}));
import { normalizeSocials } from '../../hooks/profile/useProfileHelpers';

describe('normalizeSocials legacy map', () => {
  it('normalizes legacy urls to absolute https links', () => {
    const links = normalizeSocials({
      github: 'github.com/example',
      discord: 'discord.com/users/123',
      reddit: 'https://reddit.com/u/example',
    });

    expect(links).toHaveLength(3);
    expect(links.map((link) => link.url)).toEqual([
      'https://discord.com/users/123',
      'https://reddit.com/u/example',
      'https://github.com/example',
    ]);
  });

  it('skips empty legacy entries', () => {
    const links = normalizeSocials({
      github: '',
      discord: '   ',
      reddit: 'reddit.com/u/example',
    });

    expect(links).toHaveLength(1);
    expect(links[0]?.url).toBe('https://reddit.com/u/example');
  });
});
