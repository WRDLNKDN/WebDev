import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../auth/supabaseClient';

type AuthClient = Pick<SupabaseClient, 'auth'>;

type ResolveTokenOptions = {
  client?: AuthClient;
  accessToken?: string | null;
  forceRefresh?: boolean;
};

export async function resolveAccessToken(
  options?: ResolveTokenOptions,
): Promise<string | null> {
  const client = options?.client ?? defaultSupabase;
  const explicit = options?.accessToken ?? null;
  if (explicit && !options?.forceRefresh) return explicit;

  const {
    data: { session },
  } = await client.auth.getSession();
  if (session?.access_token && !options?.forceRefresh)
    return session.access_token;

  const { data: refreshed } = await client.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

type AuthHeaderOptions = {
  client?: AuthClient;
  accessToken?: string | null;
  forceRefresh?: boolean;
  includeJsonContentType?: boolean;
};

export async function getAuthHeaders(
  options?: AuthHeaderOptions,
): Promise<HeadersInit> {
  const accessToken = await resolveAccessToken({
    client: options?.client,
    accessToken: options?.accessToken,
    forceRefresh: options?.forceRefresh,
  });
  if (!accessToken) throw new Error('Not signed in');

  return {
    ...(options?.includeJsonContentType
      ? { 'Content-Type': 'application/json' }
      : {}),
    Authorization: `Bearer ${accessToken}`,
  };
}

type AuthedFetchOptions = {
  client?: AuthClient;
  accessToken?: string | null;
  includeJsonContentType?: boolean;
  credentials?: RequestCredentials;
  retryOn401?: boolean;
};

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: AuthedFetchOptions,
): Promise<Response> {
  const credentials = options?.credentials ?? 'include';
  const headers = await getAuthHeaders({
    client: options?.client,
    accessToken: options?.accessToken,
    includeJsonContentType: options?.includeJsonContentType ?? true,
  });

  const first = await fetch(input, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
    credentials,
  });
  if (first.status !== 401 || options?.retryOn401 === false) return first;

  const refreshedToken = await resolveAccessToken({
    client: options?.client,
    forceRefresh: true,
  });
  if (!refreshedToken) return first;
  return fetch(input, {
    ...init,
    headers: {
      ...(options?.includeJsonContentType === false
        ? {}
        : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${refreshedToken}`,
      ...(init?.headers ?? {}),
    },
    credentials,
  });
}
