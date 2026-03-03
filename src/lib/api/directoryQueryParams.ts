/**
 * Directory list query string builder (no Supabase/auth deps).
 * Used by directoryApi and by tests.
 */

export interface DirectoryQueryParams {
  q?: string;
  primary_industry?: string;
  secondary_industry?: string;
  location?: string;
  skills?: string[];
  connection_status?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}

export function buildDirectoryQueryString(
  params: DirectoryQueryParams,
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.primary_industry)
    sp.set('primary_industry', params.primary_industry);
  if (params.secondary_industry)
    sp.set('secondary_industry', params.secondary_industry);
  if (params.location) sp.set('location', params.location);
  if (params.skills?.length) sp.set('skills', params.skills.join(','));
  if (params.connection_status)
    sp.set('connection_status', params.connection_status);
  if (params.sort) sp.set('sort', params.sort);
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.limit != null) sp.set('limit', String(params.limit));
  return sp.toString();
}
