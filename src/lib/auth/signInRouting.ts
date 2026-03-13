export function getSignInPostAuthPath(
  params: URLSearchParams,
  fallbackPath: string,
): string {
  const requestedNext = params.get('next')?.trim();
  return requestedNext && requestedNext.startsWith('/')
    ? requestedNext
    : fallbackPath;
}

export function getJoinSubmitAuthRedirect(): string {
  return '/signin?next=%2Fjoin';
}
