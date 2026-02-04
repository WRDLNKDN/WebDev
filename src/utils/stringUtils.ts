export const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
};

export const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Signup failed';
};
