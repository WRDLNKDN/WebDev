const DEFAULT_BUMPER_NEXT_PATH = '/feed';

const isUnsafeBumperNextPath = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized.startsWith('/')) return true;
  if (normalized.startsWith('//')) return true;

  try {
    const url = new URL(normalized, 'https://wrdlnkdn.local');
    return url.pathname === '/bumper';
  } catch {
    return true;
  }
};

export const resolveBumperNextPath = (
  nextParam: string | null | undefined,
): string => {
  if (!nextParam) return DEFAULT_BUMPER_NEXT_PATH;
  return isUnsafeBumperNextPath(nextParam)
    ? DEFAULT_BUMPER_NEXT_PATH
    : nextParam;
};
