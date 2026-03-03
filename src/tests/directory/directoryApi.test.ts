import { describe, expect, it } from 'vitest';
import {
  buildDirectoryQueryString,
  type DirectoryQueryParams,
} from '../../lib/api/directoryQueryParams';

describe('buildDirectoryQueryString', () => {
  it('returns empty string for empty params', () => {
    expect(buildDirectoryQueryString({} as DirectoryQueryParams)).toBe('');
  });

  it('includes q when provided', () => {
    const qs = buildDirectoryQueryString({ q: 'alice' });
    expect(qs).toContain('q=alice');
  });

  it('includes primary_industry and secondary_industry', () => {
    const qs = buildDirectoryQueryString({
      primary_industry: 'Technology and Software',
      secondary_industry: 'Product Management',
    });
    expect(qs).toContain('primary_industry=Technology+and+Software');
    expect(qs).toContain('secondary_industry=Product+Management');
  });

  it('includes location and connection_status', () => {
    const qs = buildDirectoryQueryString({
      location: 'San Francisco',
      connection_status: 'connected',
    });
    expect(qs).toContain('location=San+Francisco');
    expect(qs).toContain('connection_status=connected');
  });

  it('joins skills with comma', () => {
    const qs = buildDirectoryQueryString({
      skills: ['React', 'TypeScript'],
    });
    expect(qs).toContain('skills=React%2CTypeScript');
  });

  it('includes sort, offset, and limit', () => {
    const qs = buildDirectoryQueryString({
      sort: 'alphabetical',
      offset: 25,
      limit: 10,
    });
    expect(qs).toContain('sort=alphabetical');
    expect(qs).toContain('offset=25');
    expect(qs).toContain('limit=10');
  });

  it('omits empty skills array', () => {
    const qs = buildDirectoryQueryString({ skills: [] });
    expect(qs).not.toContain('skills');
  });
});
