type AuthLogLevel = 'log' | 'warn' | 'error';

const isEnabled = (): boolean => {
  try {
    return localStorage.getItem('AUTH_DEBUG') === '1';
  } catch {
    return false;
  }
};

export const authDebug = (
  level: AuthLogLevel,
  message: string,
  data?: unknown,
) => {
  if (!isEnabled()) return;

  const ts = new Date().toISOString();
  const prefix = `[AUTH ${ts}]`;

  if (data !== undefined) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
};

export const enableAuthDebug = () => {
  localStorage.setItem('AUTH_DEBUG', '1');
};

export const disableAuthDebug = () => {
  localStorage.removeItem('AUTH_DEBUG');
};
