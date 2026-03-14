import { buildErrorBoundaryCopy } from '../../components/layout/errorBoundaryCopy';

describe('buildErrorBoundaryCopy', () => {
  test('maps network failures to a plain-language network message', () => {
    expect(buildErrorBoundaryCopy('Failed to fetch')).toEqual({
      title: "We couldn't reach WRDLNKDN",
      description:
        'A network request failed while loading this page. Check your connection and try again.',
      detail: 'Failed to fetch',
      code: 'NETWORK_ERROR',
    });
  });

  test('maps auth failures to a session message', () => {
    expect(buildErrorBoundaryCopy('Auth session missing')).toEqual({
      title: 'Your session may need to be refreshed',
      description:
        'This page could not load with the current sign-in session. Reload the page and sign in again if needed.',
      detail: 'Auth session missing',
      code: 'SESSION_ERROR',
    });
  });

  test('maps dynamic import / chunk load failures to screen load message', () => {
    expect(
      buildErrorBoundaryCopy('error loading dynamically imported module'),
    ).toEqual({
      title: 'This screen did not finish loading',
      description:
        'Part of the app failed to download. Reload the page and try again.',
      detail: 'error loading dynamically imported module',
      code: 'SCREEN_LOAD_ERROR',
    });
  });

  test('falls back to a generic render error message', () => {
    expect(
      buildErrorBoundaryCopy('Cannot read properties of undefined'),
    ).toEqual({
      title: 'Something went wrong loading this page',
      description:
        'The app hit an unexpected error while rendering this screen. Reload the page and try again.',
      detail: 'Cannot read properties of undefined',
      code: 'UNEXPECTED_RENDER_ERROR',
    });
  });
});
